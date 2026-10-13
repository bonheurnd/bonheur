import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';

// Configuration interface
export interface AiConfig {
  enabled: boolean;
  model: string;
  maxTokens: number;
  hasApiKey: boolean;
}

// Model fallback list
export const SUPPORTED_MODELS = [
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-3.1-pro-preview',
];

export const DEFAULT_MODEL = 'gemini-3.8-flash';

// Get AI assistant settings from app_settings table
export function getAiAssistantConfig(): AiConfig {
  const apiKey = process.env.GEMINI_API_KEY || '';
  let enabled = true;
  let model = DEFAULT_MODEL;

  try {
    const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('ai_assistant_enabled') as { value: string } | undefined;
    if (row && (row.value === 'false' || row.value === '0')) {
      enabled = false;
    }
    const modelRow = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('ai_assistant_model') as { value: string } | undefined;
    if (modelRow && modelRow.value) {
      model = modelRow.value.trim();
    }
  } catch (err) {
    console.warn('[AI Service] Failed to read ai_settings from db, using defaults:', err);
  }

  return {
    enabled,
    model,
    maxTokens: 1024,
    hasApiKey: Boolean(apiKey && apiKey.trim().length > 0),
  };
}

// Update AI assistant settings (admin only)
export function updateAiAssistantConfig(enabled: boolean, model?: string) {
  const upsert = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)');
  upsert.run('ai_assistant_enabled', enabled ? 'true' : 'false');
  if (model) {
    upsert.run('ai_assistant_model', model.trim());
  }
}

// In-memory rate limiting map: ip -> timestamps
const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(clientIp: string, maxRequests = 20, windowMs = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = rateLimitMap.get(clientIp) || [];
  const validTimestamps = timestamps.filter(t => now - t < windowMs);

  if (validTimestamps.length >= maxRequests) {
    rateLimitMap.set(clientIp, validTimestamps);
    return { allowed: false, remaining: 0 };
  }

  validTimestamps.push(now);
  rateLimitMap.set(clientIp, validTimestamps);
  return { allowed: true, remaining: maxRequests - validTimestamps.length };
}

// Retrieve relevant context from database safely
export interface ChoirAiContext {
  matchedSongs: Array<{
    id: string;
    title: string;
    category_name?: string;
    composer?: string;
    lyrics_snippet?: string;
    full_lyrics?: string;
  }>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    event_date: string;
    location: string;
    description?: string;
  }>;
  choirInfo: {
    name: string;
    affiliation: string;
    contact_phone?: string;
    contact_email?: string;
    about?: string;
  };
}

// Extract keywords from user query
function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s\u00C0-\u017F]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3 && !['none', 'kandi', 'kuko', 'maze', 'ariko', 'what', 'with', 'from', 'this', 'that', 'have', 'pour', 'dans', 'avec'].includes(word))
    .slice(0, 8);
}

export function searchChoirDatabase(query: string): ChoirAiContext {
  const keywords = extractKeywords(query);

  // 1. Search songs by title or lyrics
  let matchedSongs: Array<{
    id: string;
    title: string;
    category_name?: string;
    composer?: string;
    lyrics_snippet?: string;
    full_lyrics?: string;
  }> = [];

  try {
    if (keywords.length > 0) {
      // Direct title match search
      const titleMatches = db.prepare(`
        SELECT s.id, s.title, s.composer, sc.name as category_name, l.content as full_lyrics
        FROM songs s
        LEFT JOIN song_categories sc ON s.category_id = sc.id
        LEFT JOIN lyrics l ON s.id = l.song_id
        WHERE s.release_status = 'released'
          AND LOWER(s.title) LIKE ?
        LIMIT 3
      `).all(`%${query.trim().toLowerCase().slice(0, 30)}%`) as any[];

      if (titleMatches.length > 0) {
        matchedSongs.push(...titleMatches.map(m => ({
          id: m.id,
          title: m.title,
          category_name: m.category_name,
          composer: m.composer,
          full_lyrics: m.full_lyrics || '',
          lyrics_snippet: m.full_lyrics ? m.full_lyrics.slice(0, 300) : '',
        })));
      }

      // Keyword based search across title and lyrics content
      for (const kw of keywords.slice(0, 4)) {
        if (matchedSongs.length >= 4) break;
        const kwMatches = db.prepare(`
          SELECT s.id, s.title, s.composer, sc.name as category_name, l.content as full_lyrics
          FROM songs s
          LEFT JOIN song_categories sc ON s.category_id = sc.id
          LEFT JOIN lyrics l ON s.id = l.song_id
          WHERE s.release_status = 'released'
            AND (LOWER(s.title) LIKE ? OR LOWER(l.content) LIKE ?)
          LIMIT 3
        `).all(`%${kw}%`, `%${kw}%`) as any[];

        for (const m of kwMatches) {
          if (!matchedSongs.some(existing => existing.id === m.id)) {
            matchedSongs.push({
              id: m.id,
              title: m.title,
              category_name: m.category_name,
              composer: m.composer,
              full_lyrics: m.full_lyrics || '',
              lyrics_snippet: m.full_lyrics ? m.full_lyrics.slice(0, 300) : '',
            });
          }
          if (matchedSongs.length >= 4) break;
        }
      }
    }
  } catch (err) {
    console.warn('[AI Service] Song search failed:', err);
  }

  // 2. Search upcoming events
  let upcomingEvents: Array<{
    id: string;
    title: string;
    event_date: string;
    location: string;
    description?: string;
  }> = [];

  try {
    const events = db.prepare(`
      SELECT id, title, event_date, location, description
      FROM events
      ORDER BY event_date ASC
      LIMIT 5
    `).all() as any[];

    upcomingEvents = events.map(e => ({
      id: e.id,
      title: e.title,
      event_date: e.event_date || '',
      location: e.location || '',
      description: e.description ? e.description.slice(0, 150) : '',
    }));
  } catch (err) {
    console.warn('[AI Service] Events query failed:', err);
  }

  // 3. General Choir Info from app_settings
  let choirInfo = {
    name: 'La Lumiere Choir',
    affiliation: 'ADEPR Nyanza, Kicukiro District, Kigali, Rwanda',
    contact_phone: '+250 788 000 000',
    contact_email: 'lalumierechoir@gmail.com',
    about: 'La Lumiere Choir is a gospel choir at ADEPR Nyanza in Kicukiro District, Rwanda, dedicated to worship, choral ministry, and spreading the Gospel.',
  };

  try {
    const settings = db.prepare('SELECT key, value FROM app_settings').all() as any[];
    const map: Record<string, string> = {};
    settings.forEach(s => { map[s.key] = s.value; });
    if (map.choir_name) choirInfo.name = map.choir_name;
    if (map.church_affiliation) choirInfo.affiliation = map.church_affiliation;
    if (map.contact_phone) choirInfo.contact_phone = map.contact_phone;
    if (map.contact_email) choirInfo.contact_email = map.contact_email;
    if (map.about_story) choirInfo.about = map.about_story;
  } catch (err) {
    // ignore
  }

  return {
    matchedSongs,
    upcomingEvents,
    choirInfo,
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'model';
  content: string;
}

export async function generateChatResponse(
  messages: ChatMessage[],
  clientIp: string
): Promise<{ text: string; matchedSongs?: Array<{ id: string; title: string; category?: string }> }> {
  const config = getAiAssistantConfig();

  if (!config.enabled) {
    return {
      text: 'Muraho! Serivisi ya La Lumiere AI Assistant ntabwo irimo gukora ubu kubera ko yahagaritswe n\'ubuyobozi (AI Assistant is currently disabled by admin).'
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return {
      text: 'Muraho! Serivisi ya La Lumiere AI Assistant ntabwo irimo gukora kuko urufunguzo rwa sisitemu (GEMINI_API_KEY) rutabonetse kuri seriveri. Mwareba mu buyobozi cyangwa mu Igenamiterere rya Render (Environment Variables).'
    };
  }

  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  const userQuery = lastUserMessage?.content || '';

  if (!userQuery.trim()) {
    return { text: 'Nta kibazo cyatanzwe. Mwanyandikira ikibazo mwifuza kubaza.' };
  }

  // Retrieve grounded data from DB
  const context = searchChoirDatabase(userQuery);

  // System instruction with choir-specific rules, language support, strict lyric quoting
  const systemInstruction = `
You are the official "La Lumiere AI Assistant" for La Lumiere Choir (Korali La Lumiere), an Evangelical choir based at ADEPR Nyanza, Kicukiro District, Kigali, Rwanda.

YOUR CORE IDENTITY & CAPABILITIES:
- Help choir members, worship leaders, and supporters with song discovery, lyrics, rehearsal advice, choir events, history, categories, and using the application.
- Fluently support Kinyarwanda, English, and French. If the user writes in Kinyarwanda, respond naturally in warm, respectful Kinyarwanda. If they write in English or French, reply in that language.
- Maintain a warm, Christian, encouraging, and respectful tone appropriate for an ADEPR choir community.

STRICT ACCURACY RULES FOR LYRICS & SONGS:
1. NEVER INVENT OR GUESS LYRICS. If lyrics are not provided in the database context or cannot be verified, state clearly that they are not currently in the choir database.
2. When quoting lyrics, quote the EXACT text from the provided database records without alterations or "corrections".
3. Always clearly distinguish quoted lyrics from your own explanation or theological reflection. Format lyrics in blockquotes or distinct lines.
4. If asked about a song found in the database, always mention its exact title and category.
5. Provide helpful song IDs so the app UI can display direct open buttons.

CHOIR EVENTS & INFORMATION RULES:
1. For choir events, rehearsal schedules, and dates, ONLY use the actual events listed in the database context. NEVER invent event dates, venues, or guest names.
2. If an event or specific policy is not recorded, honestly say that information is not available and encourage them to contact the choir leadership.
3. Keep user credentials, payments, passwords, and private directory details strictly confidential. Never reveal administrative secrets.

CURRENT CHOIR CONTEXT FROM DATABASE:
Choir Name: ${context.choirInfo.name}
Affiliation: ${context.choirInfo.affiliation}
Contact Phone: ${context.choirInfo.contact_phone}
Contact Email: ${context.choirInfo.contact_email}
About: ${context.choirInfo.about}

UPCOMING CHOIR EVENTS (Real records):
${context.upcomingEvents.length > 0
  ? context.upcomingEvents.map(e => `- ${e.title} | Itariki/Date: ${e.event_date} | Ahantu/Location: ${e.location} ${e.description ? `(${e.description})` : ''}`).join('\n')
  : 'Nta biterane cyangwa gahunda nshya zanditswe mu bubiko muri aka kanya.'}

MATCHED SONGS FROM CHOIR DATABASE FOR THIS QUERY:
${context.matchedSongs.length > 0
  ? context.matchedSongs.map(s => `[SONG ID: ${s.id}] Title: "${s.title}" | Category: ${s.category_name || 'Guhimbaza'} | Composer: ${s.composer || 'La Lumiere Choir'}
Exact Database Lyrics:
"""
${s.full_lyrics ? s.full_lyrics.slice(0, 1500) : 'Lyrics not stored.'}
"""`).join('\n\n')
  : 'Nta ndirimbo ihuye n\'iyi magambo yabonetse muri database y\'indirimbo za korali.'}

If the user asks to open or view a song that was found in the database, explicitly include a reference like: [Song: <title> | ID: <id>].
Format responses with clean paragraphs, markdown bullet points where appropriate, and clean readability.
`;

  // Initialize SDK with User-Agent telemetry
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Prepare recent message contents
  const recentMessages = messages.slice(-8).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  // Attempt generation with primary and fallback models
  const modelsToTry = [config.model, 'gemini-2.5-flash', 'gemini-3.8-flash'].filter((v, i, a) => a.indexOf(v) === i);

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: recentMessages,
        config: {
          systemInstruction,
          maxOutputTokens: 1200,
          temperature: 0.4, // lower temperature for accuracy with lyrics
        },
      });

      const responseText = response.text || '';
      return {
        text: responseText,
        matchedSongs: context.matchedSongs.map(s => ({
          id: s.id,
          title: s.title,
          category: s.category_name,
        })),
      };
    } catch (err: any) {
      lastError = err;
      console.warn(`[AI Service] Model ${modelName} failed:`, err?.message || err);
      // Try next model if available
    }
  }

  // If all model attempts failed
  console.error('[AI Service] All model attempts failed:', lastError);
  const errMsg = lastError?.message || 'Unknown AI error';

  if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
    return {
      text: 'Habaye ikibazo: Urufunguzo rwa GEMINI_API_KEY rwashyizwemo ntabwo rwemewe. Nyamuneka murebe ko rwuzuye neza mu Igenamiterere rya Render (Environment Variables).'
    };
  }

  if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota')) {
    return {
      text: 'Umurongo wa AI urahuze cyane cyangwa warangije ubushobozi bw\'aka kanya (Quota exceeded). Mwongere mugerageze mukanya gato.'
    };
  }

  return {
    text: `Muraho! Ntabwo byakunze kubona igisubizo cya AI muri aka kanya kubera: ${errMsg.slice(0, 120)}. Mwongere mugerageze mukanya.`
  };
}
