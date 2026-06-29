import { useEffect, useRef } from "react";
import { ChatMessage } from "../types";
import { HelpCircle, Sparkles, Volume2, Bot, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChatPanelProps {
  messages: ChatMessage[];
  currentReasoning: string | null;
  isLoading: boolean;
  onSpeakText: (text: string) => void;
}

export default function ChatPanel({
  messages,
  currentReasoning,
  isLoading,
  onSpeakText,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new messages stream in
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div 
      id="chat-panel-container" 
      className="flex flex-col h-full glass-panel rounded-3xl overflow-hidden shadow-2xl"
    >
      
      {/* Rationale Sticky Header (AI's WHY) */}
      <div className="p-5 border-b border-white/5 bg-zinc-950/10 relative">
        <div className="flex items-start gap-3.5">
          <div className="p-2 bg-brand-500/10 rounded-xl text-brand-500 border border-brand-500/15 mt-0.5 shrink-0 shadow-sm">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[10px] font-bold text-brand-500 tracking-wider uppercase font-mono mb-1">
              Active Strategy &amp; Coach Rationale
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans font-semibold">
              {currentReasoning || "Awaiting target input. Tell Deadline Hero what you want to achieve today, and see the logical coaching breakdown here."}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4 h-full">
              <div className="p-4 bg-zinc-900/40 rounded-2xl border border-white/10 text-zinc-500 mb-4 shadow-inner">
                <HelpCircle size={28} className="text-zinc-500" />
              </div>
              <h3 className="text-zinc-200 font-bold text-sm tracking-tight mb-1.5 font-display">Dialogue log</h3>
              <p className="text-zinc-500 text-xs max-w-[240px] leading-relaxed">
                Your coaching feedback will display here. You can push back, request a break, or negotiate the steps.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isAI = msg.role === "assistant";
              return (
                <motion.div
                  key={msg.id || index}
                  id={`chat-msg-${msg.id}`}
                  initial={{ opacity: 0, y: 12, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex items-start gap-3 ${isAI ? "justify-start" : "justify-end"}`}
                >
                  {/* Avatar Icon */}
                  {isAI && (
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-brand-500 shrink-0 shadow-sm">
                      <Bot size={15} />
                    </div>
                  )}

                  <div
                    className={`max-w-[78%] rounded-2xl p-4 leading-relaxed text-sm relative group transition-all duration-200 ${
                      isAI
                        ? "bg-zinc-850 border border-white/5 text-zinc-100 rounded-tl-none shadow-sm"
                        : "bg-brand-500 text-zinc-950 font-bold rounded-tr-none shadow-[0_4px_16px_rgba(204,255,0,0.25)]"
                    }`}
                  >
                    {/* Role Header */}
                    <div className={`text-[10px] font-mono font-bold tracking-wider mb-1.5 ${isAI ? "text-zinc-500" : "text-brand-950/80"}`}>
                      {isAI ? "DEADLINE HERO COACH" : "YOU"} &bull; {msg.timestamp}
                    </div>

                    {/* Body Content */}
                    <p className="whitespace-pre-wrap font-sans text-sm tracking-tight leading-relaxed">{msg.content}</p>

                    {/* Speak Aloud trigger visible on hover of assistant bubble */}
                    {isAI && (
                      <button
                        id={`speak-msg-${msg.id}`}
                        onClick={() => onSpeakText(msg.content)}
                        className="absolute right-3 top-3 p-1 rounded-md bg-zinc-800/80 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer"
                        title="Read aloud"
                      >
                        <Volume2 size={12} />
                      </button>
                    )}
                  </div>

                  {!isAI && (
                    <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-550 shrink-0 shadow-sm">
                      <User size={15} />
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>

        {/* Loading indicator bubble */}
        {isLoading && (
          <div className="flex justify-start items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-brand-500 shrink-0 shadow-sm animate-pulse">
              <Bot size={15} />
            </div>
            <div className="bg-zinc-850/80 border border-white/5 rounded-2xl rounded-tl-none p-4 text-zinc-400 max-w-[78%] flex items-center gap-3">
              <div className="flex gap-1 shrink-0">
                <span className="h-1.5 w-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-xs font-mono font-medium tracking-wide text-zinc-400">Recalculating chronological agenda...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
