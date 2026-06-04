"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchWithAuth } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  sql?: string;
}

interface AiChatWidgetProps {
}

export default function AiChatWidget({ }: AiChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "¡Hola! Soy tu Asistente Financiero AI. Puedo consultar tus registros en DuckDB para responder preguntas sobre ingresos, gastos o impuestos. ¿En qué puedo ayudarte hoy?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSql, setShowSql] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  
  // Drag logic states
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; moved: boolean }>({ startX: 0, startY: 0, moved: false });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    setIsDragging(true);
    dragRef.current = { startX: e.clientX - position.x, startY: e.clientY - position.y, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragRef.current.startX;
      const newY = e.clientY - dragRef.current.startY;
      if (Math.abs(newX - position.x) > 3 || Math.abs(newY - position.y) > 3) {
        dragRef.current.moved = true;
      }
      setPosition({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleClick = () => {
    if (!dragRef.current.moved) {
      setIsOpen(!isOpen);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetchWithAuth("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) throw new Error("Error en la comunicación con el asistente");

      const data = await response.json();
      
      setMessages((prev) => [
        ...prev,
        { 
          role: "assistant", 
          content: data.reply,
          sql: data.sql_query
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Lo siento, hubo un problema al procesar tu solicitud. Por favor intenta de nuevo." },
      ]);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className={`fixed bottom-8 right-8 z-100 ${isDragging ? '' : 'transition-transform duration-500'} ${isOpen && !isDragging ? 'scale-100 rotate-0' : (!isDragging ? 'hover:scale-110' : '')}`}
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      {/* ── CHAT WINDOW ────────────────────────────────────────────────────── */}
      {isOpen && <div className="absolute bottom-20 right-0 w-100 h-150 bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/40 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500 ring-1 ring-black/5">
          {/* Header */}
          <div className="p-6 bg-zinc-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest">Asistente AI</h3>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-tighter">DuckDB Powered Engine</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
                  msg.role === "user" 
                    ? "bg-linear-to-br from-emerald-500 to-emerald-600 text-white rounded-tr-none" 
                    : "bg-zinc-100 text-zinc-800 rounded-tl-none border border-zinc-200"
                }`}>
                  {msg.content}
                </div>
                
                {/* Technical Query Viewer */}
                {msg.sql && (
                  <div className="mt-4 pt-4 border-t border-black/5 w-full">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Query Engine Insight</span>
                      </div>
                      <button 
                        onClick={() => setShowSql(showSql === idx ? null : idx)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${showSql === idx ? 'bg-zinc-900 text-white shadow-lg' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900'}`}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
                        {showSql === idx ? 'Cerrar Inspector' : 'Ver Consulta Técnica'}
                      </button>
                    </div>
                    
                    {showSql === idx && (
                      <div className="group relative mt-3 animate-in fade-in zoom-in-95 duration-300">
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(msg.sql || "");
                              setCopiedIdx(idx);
                              setTimeout(() => setCopiedIdx(null), 2000);
                            }}
                            className={`p-2 rounded-lg transition-all border border-white/5 backdrop-blur-md ${copiedIdx === idx ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' : 'bg-white/10 hover:bg-white/20 text-emerald-400'}`}
                            title="Copiar SQL"
                          >
                            {copiedIdx === idx ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                            )}
                          </button>
                        </div>
                        <div className="p-5 bg-zinc-950 rounded-2xl border border-white/10 shadow-2xl overflow-x-auto scrollbar-hide ring-1 ring-emerald-500/10">
                          <code className="text-[11px] font-mono whitespace-pre leading-relaxed block">
                            {msg.sql.split(/(\s+)/).map((part, i) => {
                              const isKeyword = /^(SELECT|FROM|WHERE|GROUP|BY|ORDER|LIMIT|JOIN|ON|AND|OR|AS|DESC|ASC|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END|IN|IS|NULL|NOT|LIKE)$/i.test(part);
                              const isString = /^'.*'$|^".*"$/.test(part);
                              const isNumber = /^\d+(\.\d+)?$/.test(part);
                              
                              if (isKeyword) return <span key={i} className="text-blue-400 font-bold">{part}</span>;
                              if (isString) return <span key={i} className="text-amber-400">{part}</span>;
                              if (isNumber) return <span key={i} className="text-purple-400">{part}</span>;
                              if (/^tenant_id$/i.test(part)) return <span key={i} className="text-emerald-400 font-black underline decoration-emerald-500/50">{part}</span>;
                              return <span key={i} className="text-zinc-400">{part}</span>;
                            })}
                          </code>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex flex-col items-start space-y-2">
                <div className="bg-zinc-100 p-4 rounded-2xl rounded-tl-none border border-zinc-200 flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-xs font-black text-zinc-400 uppercase tracking-widest animate-pulse">Analizando millones de registros...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 bg-zinc-50 border-t border-zinc-100">
            <div className="relative group">
              <input 
                type="text"
                placeholder="Escribe tu pregunta financiera..."
                className="w-full bg-white border border-zinc-200 rounded-2xl py-4 pl-5 pr-14 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={isLoading}
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className={`absolute right-2 top-2 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  input.trim() 
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-105" 
                    : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 14-7-7 14-2-7-7-2Z"/></svg>
              </button>
            </div>
            <p className="mt-3 text-[10px] text-center font-black text-zinc-300 uppercase tracking-widest">
              Seguridad Multi-tenant Activa
            </p>
          </div>
        </div>
      }

      {/* ── FLOATING BUTTON ────────────────────────────────────────────────── */}
      <button 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-500 group relative touch-none select-none ${
          isDragging ? "cursor-grabbing scale-105" : "cursor-pointer"
        } ${
          isOpen ? "bg-zinc-950 rotate-90" : "bg-emerald-500 hover:scale-110 active:scale-95"
        }`}
      >
        {isOpen ? (
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        ) : (
          <>
            <div className="absolute inset-0 bg-emerald-500 rounded-3xl animate-ping opacity-20" />
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          </>
        )}
      </button>
    </div>
  );
}
