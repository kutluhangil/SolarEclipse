/**
 * SolarOracleChat — Gemini 2.0 Flash powered AI assistant
 * Provides real-time eclipse science Q&A with live telemetry context.
 * Uses @google/genai SDK with streaming responses.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Bot, ChevronDown, CornerDownLeft, Loader2, MessageSquare, Sparkles, X } from 'lucide-react';
import type { ChatMessage, ObservationStation, TelemetryReadout } from '../types';

// ─── Props ───────────────────────────────────────────────────────────────────

interface SolarOracleChatProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStation: ObservationStation;
  telemetry: TelemetryReadout;
  currentTimestamp: number; // seconds since midnight UTC
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function secondsToUTC(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')} UTC`;
}

function buildSystemPrompt(station: ObservationStation, telemetry: TelemetryReadout, ts: number): string {
  return `You are Solar Oracle, an expert AI assistant for the 2026 Total Solar Eclipse Tracker application.

## Current Observation Context
- **Station**: ${station.name} (${station.country})
- **Coordinates**: ${station.coords.lat.toFixed(4)}°N, ${station.coords.lon.toFixed(4)}°E
- **Current UTC Time**: ${secondsToUTC(ts)}
- **Eclipse Phase**: ${telemetry.currentPhase}
- **Solar Obscuration**: ${telemetry.obscurationPercentage.toFixed(1)}%
- **Sun Altitude**: ${telemetry.sunAltitudeDegrees.toFixed(1)}°
- **Distance to Umbra Centerline**: ${telemetry.distanceToUmbraKm} km
- **Totality Start**: ${station.eclipseTimes.startTotality || 'N/A'} UTC
- **Totality End**: ${station.eclipseTimes.endTotality || 'N/A'} UTC
- **Totality Duration**: ${station.eclipseTimes.durationSeconds || 0} seconds

## Your Role
- Answer questions about solar eclipses, astronomy, and this specific event
- Explain phenomena users are observing in real-time (shadow bands, Baily's beads, corona, etc.)
- Provide scientific context in an accessible yet accurate way
- Reference the live telemetry data above when relevant
- Be concise — aim for 2-4 sentences per response unless detailed explanation is requested
- If asked about weather or forecasts, note that live data may be unavailable for 2026

## Eclipse Date
August 12, 2026 — Path crosses: Russia → Arctic Ocean → Greenland → Iceland → Spain → Morocco.
This is a 1m04s maximum totality eclipse with magnitude 1.028.

Keep responses focused, scientifically accurate, and engaging. Use markdown sparingly — bold for key terms only.`;
}

// ─── Suggested Prompts ───────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  "What will I see during totality?",
  "Why does temperature drop during an eclipse?",
  "What are shadow bands?",
  "Explain the corona I'll see",
  "Best time to look without glasses?",
  "Why is this path going through Spain?",
];

// ─── Component ───────────────────────────────────────────────────────────────

const SolarOracleChat: React.FC<SolarOracleChatProps> = ({
  isOpen,
  onClose,
  selectedStation,
  telemetry,
  currentTimestamp,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `🌑 **Solar Oracle online.** I'm your AI guide for the 2026 Total Solar Eclipse. Ask me anything — from the science of shadow bands to what you'll experience during totality at **${selectedStation.name}**.`,
      timestamp: Date.now(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);

  // Initialize Gemini client
  useEffect(() => {
    const apiKey = (import.meta as any).env?.GEMINI_API_KEY ||
                   (import.meta as any).env?.VITE_GEMINI_API_KEY ||
                   '';
    if (apiKey) {
      aiRef.current = new GoogleGenAI({ apiKey });
    } else {
      setError('GEMINI_API_KEY not set. Add it to your .env file.');
    }
  }, []);

  // Update welcome message when station changes
  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'model',
      text: `🌑 **Solar Oracle online.** I'm your AI guide for the 2026 Total Solar Eclipse. Ask me anything — from the science of shadow bands to what you'll experience during totality at **${selectedStation.name}**.`,
      timestamp: Date.now(),
    }]);
  }, [selectedStation.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || isLoading) return;
    if (!aiRef.current) {
      setError('Gemini AI not initialized. Check your API key.');
      return;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: userText.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    // Placeholder for streaming response
    const assistantId = `assistant-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'model',
      text: '',
      timestamp: Date.now(),
      isStreaming: true,
    } as ChatMessage & { isStreaming: boolean }]);

    try {
      const systemPrompt = buildSystemPrompt(selectedStation, telemetry, currentTimestamp);

      // Build conversation history for context (last 10 messages)
      const history = messages.slice(-10).map(msg => ({
        role: msg.role as 'user' | 'model',
        parts: [{ text: msg.text }],
      }));

      const response = await aiRef.current.models.generateContentStream({
        model: 'gemini-2.0-flash',
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
          maxOutputTokens: 512,
        },
        contents: [
          ...history,
          { role: 'user', parts: [{ text: userText.trim() }] },
        ],
      });

      let fullText = '';
      for await (const chunk of response) {
        const chunkText = chunk.text ?? '';
        fullText += chunkText;
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantId
              ? { ...msg, text: fullText }
              : msg
          )
        );
      }

      // Mark streaming complete
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantId
            ? { ...msg, text: fullText, isStreaming: false } as ChatMessage
            : msg
        )
      );
    } catch (err) {
      console.error('[SolarOracle] Gemini error:', err);
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantId
            ? { ...msg, text: `⚠️ Oracle unavailable: ${errMsg}`, isStreaming: false } as ChatMessage
            : msg
        )
      );
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, selectedStation, telemetry, currentTimestamp]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col w-[340px] max-w-[calc(100vw-24px)] shadow-2xl font-mono">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 bg-[#050505]/95 backdrop-blur-2xl border border-amber-500/40 rounded-t-xl cursor-pointer select-none shadow-[0_0_24px_rgba(245,158,11,0.2)]"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="w-4 h-4 text-amber-400" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <span className="text-amber-300 font-bold text-xs tracking-wider uppercase">Solar Oracle</span>
          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded border border-amber-500/30 font-bold">AI</span>
          <span className="text-[9px] text-slate-500 font-sans">{selectedStation.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
            className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMinimized ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[320px] min-h-[200px] bg-[#050505]/95 backdrop-blur-xl border-x border-white/10 px-3 py-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5 ${
                  msg.role === 'user'
                    ? 'bg-sky-500/30 text-sky-300 border border-sky-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {msg.role === 'user' ? '👤' : '🌑'}
                </div>

                {/* Bubble */}
                <div className={`max-w-[82%] rounded-xl px-2.5 py-2 text-[11px] leading-relaxed border ${
                  msg.role === 'user'
                    ? 'bg-sky-500/15 text-sky-100 border-sky-500/25 rounded-tr-sm'
                    : 'bg-white/5 text-slate-200 border-white/10 rounded-tl-sm'
                }`}>
                  {/* Render markdown-like bold */}
                  <span dangerouslySetInnerHTML={{
                    __html: (msg.text || '')
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-300">$1</strong>')
                      .replace(/\n/g, '<br/>')
                  }} />
                  {(msg as any).isStreaming && (
                    <span className="inline-block w-1.5 h-3 bg-amber-400 animate-pulse ml-0.5 rounded-sm" />
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.text === '' && (
              <div className="flex items-center gap-2 text-[10px] text-slate-500 pl-7">
                <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                <span>Oracle thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts */}
          {messages.length <= 1 && (
            <div className="bg-[#050505]/95 border-x border-white/10 px-3 py-2 flex flex-wrap gap-1.5">
              {SUGGESTED_PROMPTS.slice(0, 4).map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  disabled={isLoading}
                  className="text-[9px] bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 border border-white/10 hover:border-amber-500/30 px-2 py-1 rounded transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Error banner */}
          {error && !error.includes('GEMINI_API_KEY') && (
            <div className="bg-rose-500/10 border-x border-rose-500/20 px-3 py-1.5 text-[10px] text-rose-300 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>API error — check console for details</span>
            </div>
          )}

          {error && error.includes('GEMINI_API_KEY') && (
            <div className="bg-amber-500/10 border-x border-amber-500/20 px-3 py-2 text-[10px] text-amber-300 leading-relaxed">
              <strong>Setup required:</strong> Add <code className="bg-black/40 px-1 rounded">GEMINI_API_KEY=your_key</code> to your <code className="bg-black/40 px-1 rounded">.env</code> file and restart dev server.
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 bg-[#050505]/95 backdrop-blur-xl border border-amber-500/30 rounded-b-xl px-3 py-2.5"
          >
            <MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the eclipse..."
              disabled={isLoading || !!error?.includes('API_KEY')}
              className="flex-1 bg-transparent text-[11px] text-slate-200 placeholder-slate-600 outline-none font-mono disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading || !!error?.includes('API_KEY')}
              className="shrink-0 p-1 rounded text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Send (Enter)"
            >
              {isLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <CornerDownLeft className="w-3.5 h-3.5" />
              }
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default SolarOracleChat;
