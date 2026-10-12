import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  RotateCcw,
  BookOpen,
  Music,
  ExternalLink,
  Bot,
  User as UserIcon,
  AlertCircle,
  Lightbulb,
  Calendar,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  matchedSongs?: Array<{ id: string; title: string; category?: string }>;
}

interface AiAssistantScreenProps {
  onSelectSong: (songId: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

const SUGGESTED_PROMPTS = [
  {
    labelRw: 'Shaka indirimbo z\'agakiza',
    labelEn: 'Search salvation songs',
    prompt: 'Mbwira indirimbo ziri mu cyiciro cy\'Agakiza (Salvation) muri La Lumiere Choir?',
  },
  {
    labelRw: 'Amagambo ya "Yesu Yesu Mwami"',
    labelEn: 'Lyrics for "Yesu Yesu Mwami"',
    prompt: 'Nshakira amagambo yose y\'indirimbo "Yesu Yesu Mwami" n\'inyigisho irimo.',
  },
  {
    labelRw: 'Gahunda y\'ibitaramo n\'imyitozo',
    labelEn: 'Upcoming concerts & events',
    prompt: 'Ni ibihe bitaramo cyangwa gahunda z\'uburirimbyi biri imbere muri Korali?',
  },
  {
    labelRw: 'Inama zo kuririmba neza',
    labelEn: 'Vocal warm-up tips',
    prompt: 'Mpa inama z\'uburyo umuntu ategura ijwi mbere y\'imyitozo y\'amajwi (vocal exercises).',
  },
];

export const AiAssistantScreen: React.FC<AiAssistantScreenProps> = ({
  onSelectSong,
  onNavigateToTab,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('lalumiere_ai_chat');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      {
        id: 'initial_welcome',
        role: 'assistant',
        content: `Muraho neza! Ndi **La Lumiere AI Assistant**.\n\nNiteguye kugufasha:\n- Gushakisha no gusobanura indirimbo za Korali n'amagambo yazo (lyrics)\n- Kumenya icyiciro cy'indirimbo (Agakiza, Kwizera, Ijuru, Gushima)\n- Gusobanukirwa gahunda z'ibitaramo n'imyitozo y'amajwi\n- Inama zo gutegura ijwi no kuririmba muri Korali\n\n*Ushobora kumbaza mu Kinyarwanda, English, cyangwa mu Gifaransa.*`,
        timestamp: Date.now(),
      },
    ];
  });

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<{
    enabled: boolean;
    hasApiKey: boolean;
    model: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check backend AI status
  useEffect(() => {
    fetch('/api/ai/config')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setServiceStatus({
            enabled: data.enabled,
            hasApiKey: data.hasApiKey,
            model: data.model,
          });
        }
      })
      .catch(err => {
        console.warn('Failed to fetch AI configuration:', err);
      });
  }, []);

  // Save conversation in local storage
  useEffect(() => {
    try {
      localStorage.setItem('lalumiere_ai_chat', JSON.stringify(messages));
    } catch (e) {
      // ignore
    }
  }, [messages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleClearChat = () => {
    if (window.confirm('Urashaka gutangira ikiganiro gishya (Start new conversation)?')) {
      const resetMessages: ChatMessage[] = [
        {
          id: 'welcome_' + Date.now(),
          role: 'assistant',
          content: 'Ikiganiro cyasubiwemo bushya. Ni iki nabafasha ku ndirimbo cyangwa gahunda za Korali?',
          timestamp: Date.now(),
        },
      ];
      setMessages(resetMessages);
      localStorage.removeItem('lalumiere_ai_chat');
      setErrorBanner(null);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    setErrorBanner(null);

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputValue('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Habaye ikosa ryo kuvugana na seriveri ya AI.');
      }

      const botMsg: ChatMessage = {
        id: 'reply_' + Date.now(),
        role: 'assistant',
        content: data.reply || 'Nta gisubizo cyatanzwe na AI.',
        timestamp: Date.now(),
        matchedSongs: data.matchedSongs || [],
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorText = err.message || 'Ikosa rya tekiniki mugihe hashakwaga igisubizo.';
      setErrorBanner(errorText);
      const botMsg: ChatMessage = {
        id: 'err_' + Date.now(),
        role: 'assistant',
        content: `Muraho! Ntabwo byakunze kubona igisubizo cya AI muri aka kanya: **${errorText}**.\n\n*Niba uri Umuyobozi (Admin), suzuma ko urufunguzo rwa GEMINI_API_KEY rwashyizwe mu Igenamiterere rya Render (Environment Variables).*`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to render markdown-like paragraphs and bullet points nicely
  const renderFormattedMessage = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={idx} className="h-2" />;
      }

      // Check if it's a blockquote (lyrics quote)
      if (trimmed.startsWith('>') || trimmed.startsWith('"""')) {
        return (
          <div
            key={idx}
            className="my-1.5 pl-3 border-l-3 border-amber-500 bg-amber-50/60 dark:bg-amber-950/20 py-1 px-2 rounded-r-md text-slate-800 font-serif italic text-sm"
          >
            {trimmed.replace(/^>\s*/, '').replace(/^"""/, '')}
          </div>
        );
      }

      // Check if it's a bullet point
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const bulletText = trimmed.substring(2);
        return (
          <div key={idx} className="flex items-start gap-2 my-1 text-sm text-slate-800">
            <span className="text-blue-900 font-bold leading-5">•</span>
            <span className="flex-1 leading-relaxed">
              {formatInlineFormatting(bulletText)}
            </span>
          </div>
        );
      }

      // Check if it's a header
      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-bold text-slate-900 text-sm mt-2 mb-1">
            {trimmed.replace('### ', '')}
          </h4>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h3 key={idx} className="font-extrabold text-slate-900 text-base mt-3 mb-1.5 font-serif text-blue-950">
            {trimmed.replace('## ', '')}
          </h3>
        );
      }

      return (
        <p key={idx} className="leading-relaxed text-sm text-slate-800 my-0.5">
          {formatInlineFormatting(line)}
        </p>
      );
    });
  };

  const formatInlineFormatting = (text: string) => {
    // Parse bold **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-slate-950">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[500px] max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden mb-24">
      {/* Assistant Header */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white p-4 px-5 flex items-center justify-between border-b border-blue-900/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400 text-blue-950 flex items-center justify-center shadow-inner">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base tracking-tight font-serif text-white">
                La Lumiere AI Assistant
              </h2>
              <span className="bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                GenAI
              </span>
            </div>
            <p className="text-xs text-blue-200/90">
              Ubufasha ku ndirimbo, amagambo, n'uburirimbyi muri Korali
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleClearChat}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-95"
            title="Tangira ikiganiro gishya"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Gishya</span>
          </button>
        </div>
      </div>

      {/* Service Warning Banner if missing API key or disabled */}
      {serviceStatus && (!serviceStatus.hasApiKey || !serviceStatus.enabled) && (
        <div className="bg-amber-50 border-b border-amber-200 p-3 px-4 flex items-start gap-3 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            {!serviceStatus.enabled ? (
              <p>
                <strong>AI Assistant yahagaritswe:</strong> Ubuyobozi bwafunze ubufasha bwa AI muri aka kanya.
              </p>
            ) : !serviceStatus.hasApiKey ? (
              <p>
                <strong>Urufunguzo rwa AI rurakenewe:</strong> Kuri Render, shyiramo <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">GEMINI_API_KEY</code> mu Environment Settings kugira ngo AI itangire gukora neza.
              </p>
            ) : null}
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                <Bot className="w-4 h-4 text-amber-400" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 shadow-xs relative group ${
                msg.role === 'user'
                  ? 'bg-blue-900 text-white rounded-tr-xs'
                  : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div>
                  <div className="space-y-1">{renderFormattedMessage(msg.content)}</div>

                  {/* Matched Songs Quick Actions */}
                  {msg.matchedSongs && msg.matchedSongs.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Indirimbo zavuzwe muri database:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {msg.matchedSongs.map(s => (
                          <button
                            key={s.id}
                            onClick={() => onSelectSong(s.id)}
                            className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all active:scale-95 text-left"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-blue-800" />
                            <span>{s.title}</span>
                            <ChevronRight className="w-3 h-3 opacity-60" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions (Copy) */}
                  <div className="mt-2.5 flex items-center justify-end gap-2 text-slate-400">
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="p-1 hover:text-slate-700 rounded transition-colors text-[11px] flex items-center gap-1"
                      title="Kopera igisubizo"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-medium">Bikoporowe</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Kopera</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-xs mt-1">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-4 h-4 text-amber-400" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-3 px-4 flex items-center gap-2.5 text-slate-600 text-xs shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-blue-900" />
              <span>La Lumiere AI Assistant irimo gushaka no gutunganya igisubizo...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts (if only initial message or user wants quick discovery) */}
      {messages.length <= 2 && !isLoading && (
        <div className="p-3 bg-white border-t border-slate-100 overflow-x-auto">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            Ibibazo byakugirira umumaro:
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {SUGGESTED_PROMPTS.map((sp, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(sp.prompt)}
                className="shrink-0 text-left bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 px-3 py-1.5 rounded-xl text-xs text-slate-700 transition-all font-medium active:scale-95"
              >
                {sp.labelRw}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200/90">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={e => {
                setInputValue(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder="Baza ikibazo ku ndirimbo, lyrics, amatariki, cyangwa uburirimbyi..."
              className="w-full resize-none max-h-28 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-slate-900 border border-slate-200 focus:border-blue-900 focus:ring-1 focus:ring-blue-900 rounded-2xl py-2.5 px-4 text-sm focus:outline-hidden transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className={`p-3 rounded-2xl transition-all shadow-xs flex items-center justify-center shrink-0 ${
              inputValue.trim() && !isLoading
                ? 'bg-blue-900 hover:bg-blue-950 text-white active:scale-95 cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title="Ohereza (Send)"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
        <p className="text-[10px] text-center text-slate-400 mt-2">
          La Lumiere AI ishingiye ku makuru y'indirimbo zanditswe muri database ya Korali.
        </p>
      </div>
    </div>
  );
};
