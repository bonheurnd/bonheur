import express, { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { db } from '../../../server/db.js';
import {
  getAiAssistantConfig,
  updateAiAssistantConfig,
  checkRateLimit,
  searchChoirDatabase,
  SUPPORTED_MODELS,
  DEFAULT_MODEL,
  ChatMessage
} from '../../../server/aiService.js';

const router: Router = Router();

/**
 * Helper to safely query songs and lyrics for AI context
 */
export function querySongDatabaseContext(query: string) {
  return searchChoirDatabase(query);
}

/**
 * GET /api/ai/config or /config
 * Returns public AI assistant status and configuration
 */
const handleGetConfig = (req: Request, res: Response) => {
  try {
    const config = getAiAssistantConfig();
    return res.json({
      success: true,
      enabled: config.enabled,
      model: config.model,
      hasApiKey: config.hasApiKey,
      supportedModels: SUPPORTED_MODELS,
    });
  } catch (err: any) {
    console.error('[AI Router] Error getting config:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve AI configuration',
    });
  }
};

router.get('/config', handleGetConfig);
router.get('/api/ai/config', handleGetConfig);

/**
 * POST /api/ai/chat or /chat
 * Handles conversational queries with Google GenAI SDK and grounded choir database context
 */
const handleChat = async (req: Request, res: Response) => {
  try {
    // 1. IP-based Rate Limiting (Abuse prevention)
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
    const rateCheck = checkRateLimit(clientIp, 30, 60000);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: "Ubusabe buri hejuru y'urugero rwemewe (Too many requests). Nyamuneka gerageza mukanya gato.",
      });
    }

    // 2. Validate user messages payload first
    const { messages, message } = req.body;
    let chatMessages: ChatMessage[] = [];

    if (Array.isArray(messages) && messages.length > 0) {
      chatMessages = messages
        .filter((m: any) => m && typeof m.content === 'string' && m.content.trim())
        .map((m: any) => ({
          role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content).slice(0, 2000), // Enforce reasonable length limit
        }));
    } else if (typeof message === 'string' && message.trim()) {
      chatMessages = [{ role: 'user', content: message.trim().slice(0, 2000) }];
    } else {
      return res.status(400).json({
        success: false,
        error: 'Ubutumwa ntibwabonetse (No message or messages array provided)',
      });
    }

    // 3. Check if AI Assistant is enabled in admin settings
    const config = getAiAssistantConfig();
    if (!config.enabled) {
      return res.json({
        success: true,
        reply: "Muraho! Serivisi ya La Lumiere AI Assistant ntabwo irimo gukora ubu kubera ko yahagaritswe n'ubuyobozi (AI Assistant is currently disabled by admin).",
        matchedSongs: [],
      });
    }

    // 4. Check for GEMINI_API_KEY environment variable
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      return res.json({
        success: true,
        reply: "Muraho! Serivisi ya La Lumiere AI Assistant ntabwo irimo gukora kuko urufunguzo rwa sisitemu (GEMINI_API_KEY) rutabonetse kuri seriveri. Mwareba mu buyobozi cyangwa mu Igenamiterere rya Render (Environment Variables).",
        matchedSongs: [],
      });
    }

    // Find the latest user query to ground in the song database
    const lastUserMsg = [...chatMessages].reverse().find(m => m.role === 'user');
    const userQuery = lastUserMsg?.content || '';

    // 5. Query Song Database for Grounding Context
    const choirContext = searchChoirDatabase(userQuery);

    // Build grounding instruction
    const systemInstruction = `
You are the official "La Lumiere AI Assistant" for La Lumiere Choir (Korali La Lumiere), an Evangelical gospel choir based at ADEPR Nyanza, Kicukiro District, Kigali, Rwanda.

YOUR CORE IDENTITY & CAPABILITIES:
- Help choir members, worship leaders, singers, and guests with song discovery, lyrics lookup, rehearsal preparation, vocal advice, choir events, history, categories, and using the application.
- Fluently support Kinyarwanda, English, and French. If the user writes in Kinyarwanda, respond naturally in warm, respectful Kinyarwanda. If they write in English or French, reply in that language.
- Maintain a warm, Christian, encouraging, and respectful tone appropriate for an ADEPR choir community.

STRICT ACCURACY RULES FOR LYRICS & SONGS:
1. NEVER INVENT OR GUESS LYRICS. If lyrics are not stored in the database context or cannot be verified, state clearly that they are not currently in the choir database.
2. When quoting lyrics, quote the EXACT text from the provided database records without alterations or "corrections".
3. Always clearly distinguish quoted lyrics from your own explanation or theological reflection. Format lyrics in blockquotes or distinct lines.
4. If asked about a song found in the database, always mention its exact title and category.
5. Provide helpful song references like [Song: <title> | ID: <id>] so users can identify the exact song.

CHOIR EVENTS & INFORMATION RULES:
1. For choir events, rehearsal schedules, and dates, ONLY use the actual events listed in the database context. NEVER invent event dates, venues, or guest names.
2. If an event or specific policy is not recorded, honestly say that information is not available and encourage them to contact choir leadership.
3. Keep user credentials, payments, passwords, and private directory details strictly confidential. Never reveal administrative secrets.

CURRENT CHOIR CONTEXT FROM DATABASE:
Choir Name: ${choirContext.choirInfo.name}
Affiliation: ${choirContext.choirInfo.affiliation}
Contact Phone: ${choirContext.choirInfo.contact_phone}
Contact Email: ${choirContext.choirInfo.contact_email}
About: ${choirContext.choirInfo.about}

UPCOMING CHOIR EVENTS (Real records from database):
${choirContext.upcomingEvents.length > 0
  ? choirContext.upcomingEvents.map((e: any) => `- ${e.title} | Itariki/Date: ${e.event_date} | Ahantu/Location: ${e.location} ${e.description ? `(${e.description})` : ''}`).join('\n')
  : 'Nta biterane cyangwa gahunda nshya zanditswe mu bubiko muri aka kanya.'}

MATCHED SONGS FROM CHOIR DATABASE FOR THIS QUERY:
${choirContext.matchedSongs.length > 0
  ? choirContext.matchedSongs.map((s: any) => `[SONG ID: ${s.id}] Title: "${s.title}" | Category: ${s.category_name || 'Guhimbaza'} | Composer: ${s.composer || 'La Lumiere Choir'}
Exact Database Lyrics:
"""
${s.full_lyrics ? s.full_lyrics.slice(0, 1500) : 'Lyrics not stored.'}
"""`).join('\n\n')
  : "Nta ndirimbo ihuye n'aya magambo yabonetse mu bubiko bw'indirimbo za korali (No songs matched this specific phrase in the database)."}

Format responses with clean paragraphs, markdown bullet points where appropriate, and clean readability.
`;

    // 6. Initialize Google GenAI SDK
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Limit conversation history to latest 8 turns
    const historyPayload = chatMessages.slice(-8).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Models to try with graceful fallback
    const selectedModel = config.model || DEFAULT_MODEL;
    const modelsToTry = [selectedModel, 'gemini-3.8-flash', 'gemini-2.5-flash'].filter((v, i, a) => a.indexOf(v) === i);

    let generatedText = '';
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: historyPayload,
          config: {
            systemInstruction,
            maxOutputTokens: 1200,
            temperature: 0.4,
          },
        });

        if (response.text) {
          generatedText = response.text;
          break;
        }
      } catch (genErr: any) {
        lastError = genErr;
        console.warn(`[AI Router] Model ${modelName} error:`, genErr?.message || genErr);
      }
    }

    if (!generatedText) {
      if (lastError) {
        const errMsg = lastError.message || String(lastError);
        if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
          generatedText = "Habaye ikibazo: Urufunguzo rwa GEMINI_API_KEY rwashyizwemo ntabwo rwemewe. Nyamuneka murebe ko rwuzuye neza mu Igenamiterere rya Render (Environment Variables).";
        } else if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota')) {
          generatedText = "Umurongo wa AI urahuze cyane cyangwa warangije ubushobozi bw'aka kanya (Quota exceeded). Mwongere mugerageze mukanya gato.";
        } else {
          generatedText = `Muraho! Ntabwo byakunze kubona igisubizo cya AI muri aka kanya kubera: ${errMsg.slice(0, 120)}. Mwongere mugerageze mukanya.`;
        }
      } else {
        generatedText = "Nta gisubizo cyabonetse muri aka kanya. Nyamuneka mwongere mugerageze.";
      }
    }

    return res.json({
      success: true,
      reply: generatedText,
      matchedSongs: choirContext.matchedSongs.map((s: any) => ({
        id: s.id,
        title: s.title,
        category: s.category_name,
      })),
    });
  } catch (err: any) {
    console.error('[AI Router Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Habaye ikosa ryo gutunganya ubusabe bwa AI: ' + (err?.message || 'Server error'),
    });
  }
};

router.post('/chat', handleChat);
router.post('/api/ai/chat', handleChat);

/**
 * GET /api/ai/songs/search
 * Safely search the song database for frontend auto-complete or assistant integration
 */
router.get('/songs/search', (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || '').trim();
    if (!query) {
      return res.json({ success: true, songs: [] });
    }
    const context = searchChoirDatabase(query);
    return res.json({
      success: true,
      songs: context.matchedSongs,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Database search error' });
  }
});

export { router as aiRouter };
export default router;
