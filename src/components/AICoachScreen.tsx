import { useState, useEffect, useRef, FormEvent, useMemo } from "react";
import { ChatMessage, PlanStep } from "../types";
import { Mic, Send, Volume2, VolumeX, Radio, Bot, User, HelpCircle, Sparkles, AlertCircle, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AICoachScreenProps {
  messages: ChatMessage[];
  currentReasoning: string | null;
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onSpeakText: (text: string) => void;
  plan: PlanStep[];
  streak: number;
}

export default function AICoachScreen({
  messages,
  currentReasoning,
  isLoading,
  onSendMessage,
  onSpeakText,
  plan,
  streak,
}: AICoachScreenProps) {
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new messages come in
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Calculate high-fidelity custom Focus Score and Rhythm stats for "Why this plan" panel
  const completedCount = useMemo(() => plan.filter((step) => step.completed).length, [plan]);
  const totalCount = plan.length;
  
  const focusScore = useMemo(() => {
    if (totalCount === 0) return 85; // baseline
    const ratio = completedCount / totalCount;
    return Math.min(Math.round(80 + ratio * 15 + streak * 1), 99);
  }, [completedCount, totalCount, streak]);

  const bioRhythmState = useMemo(() => {
    if (completedCount === totalCount && totalCount > 0) return "FLAWLESS FLOW";
    if (completedCount > 0) return "HIGH FOCUS PEAK";
    return "TACTICAL READY";
  }, [completedCount, totalCount]);

  // Speech Web API initialization
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage("Listening to voice input...");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
          setStatusMessage(`Speech captured: "${transcript}"`);
          setTimeout(() => {
            onSendMessage(transcript);
            setInputText("");
            setStatusMessage(null);
          }, 800);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setStatusMessage("Microphone permission denied. Allow mic access in address bar.");
        } else {
          setStatusMessage(`Mic error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    if ("speechSynthesis" in window) {
      setVoiceSupported(true);
      synthesisRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, [onSendMessage]);

  const spokenMessagesRef = useRef<Set<string>>(new Set());

  // On mount, add all existing assistant messages to the spoken set to avoid re-speaking them
  useEffect(() => {
    messages.forEach((m) => {
      if (m.role === "assistant" && m.id) {
        spokenMessagesRef.current.add(m.id);
      }
    });
  }, []);

  // Read aloud last message from AI Coach
  const lastAiMsg = useMemo(() => {
    const aiMsgs = messages.filter((m) => m.role === "assistant");
    return aiMsgs.length > 0 ? aiMsgs[aiMsgs.length - 1] : null;
  }, [messages]);

  useEffect(() => {
    if (lastAiMsg && lastAiMsg.id && !spokenMessagesRef.current.has(lastAiMsg.id)) {
      if (!isMuted && voiceSupported && synthesisRef.current) {
        synthesisRef.current.cancel();
        const cleaned = lastAiMsg.content.replace(/[*_#`\[\]]/g, "");
        const utterance = new SpeechSynthesisUtterance(cleaned);
        utterance.rate = 1.05;
        synthesisRef.current.speak(utterance);
        spokenMessagesRef.current.add(lastAiMsg.id);
      }
    }
  }, [lastAiMsg, isMuted, voiceSupported]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText("");
    setStatusMessage(null);
  };

  const toggleListening = () => {
    if (!speechSupported) {
      setStatusMessage("Web Speech API not supported in browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Start speech recognition failed:", err);
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted && synthesisRef.current) {
      synthesisRef.current.cancel();
    }
  };

  return (
    <div id="screen-ai-coach" className="flex flex-col h-full space-y-4 overflow-hidden">
      
      {/* "Why this plan" Reasoning / Strategy Panel */}
      <div className="bg-zinc-950/45 border border-white/5 p-4 rounded-3xl space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio size={13} className="text-brand-500 animate-pulse" />
            <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-400 uppercase">
              COACH STRATEGY DEPLOYMENT
            </span>
          </div>

          {/* Voice Mute Toggle */}
          {voiceSupported && (
            <button
              id="coach-screen-mute-toggle"
              onClick={toggleMute}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold font-mono border transition-colors cursor-pointer ${
                isMuted
                  ? "bg-zinc-900 border-white/5 text-zinc-500"
                  : "bg-brand-500/10 border-brand-500/20 text-brand-500 shadow-[0_0_8px_rgba(204,255,0,0.1)]"
              }`}
            >
              {isMuted ? <VolumeX size={10} /> : <Volume2 size={10} className="animate-pulse" />}
              <span>{isMuted ? "MUTED" : "SYNTH ACTIVE"}</span>
            </button>
          )}
        </div>

        {/* Dynamic Focus Score / Bio-Rhythm Badges */}
        <div className="grid grid-cols-2 gap-3 pb-2 border-b border-white/5">
          <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-white/5 flex items-center gap-2.5">
            <Zap size={14} className="text-brand-500" />
            <div>
              <span className="text-[8px] font-mono font-bold text-zinc-500 tracking-wider uppercase block">Focus Index</span>
              <span className="text-xs font-black text-brand-500">{focusScore}% ACTIVE</span>
            </div>
          </div>
          <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-white/5 flex items-center gap-2.5">
            <Bot size={14} className="text-brand-500" />
            <div>
              <span className="text-[8px] font-mono font-bold text-zinc-500 tracking-wider uppercase block">Bio-Rhythm State</span>
              <span className="text-xs font-black text-zinc-200">{bioRhythmState}</span>
            </div>
          </div>
        </div>

        {/* Coach Rationale Paragraph */}
        <div className="space-y-1">
          <span className="text-[8px] font-mono font-black text-brand-500 tracking-wider uppercase block">WHY THIS PLAN:</span>
          <p className="text-xs text-zinc-300 leading-relaxed font-sans font-semibold">
            {currentReasoning || "Provide a target milestone below. The AI planning engine will immediately draft an optimized chronological sequence."}
          </p>
        </div>
      </div>

      {/* Messages Scroll Panel */}
      <div className="flex-1 bg-zinc-950/20 border border-white/5 rounded-3xl p-4 overflow-y-auto space-y-4 scrollbar-thin min-h-0">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 px-4 h-full">
              <div className="p-3 bg-zinc-900/40 border border-white/5 rounded-2xl text-zinc-500 mb-3">
                <HelpCircle size={22} />
              </div>
              <h4 className="text-zinc-300 font-bold text-xs font-display">Dialogue log is empty</h4>
              <p className="text-zinc-500 text-[10px] max-w-[180px] leading-relaxed">
                Negotiate details or request task optimization. I am here to help you finish.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isAI = msg.role === "assistant";
              return (
                <motion.div
                  key={msg.id || idx}
                  id={`screen-chat-${msg.id}`}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-start gap-2.5 ${isAI ? "justify-start" : "justify-end"}`}
                >
                  {isAI && (
                    <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-brand-500 shrink-0">
                      <Bot size={13} />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed text-xs relative group transition-all duration-200 ${
                      isAI
                        ? "bg-zinc-900/90 border border-white/5 text-zinc-150 rounded-tl-none"
                        : "bg-brand-500 text-zinc-950 font-bold rounded-tr-none shadow-[0_4px_12px_rgba(204,255,0,0.18)]"
                    }`}
                  >
                    <div className={`text-[8.5px] font-mono font-bold tracking-wider mb-1 ${isAI ? "text-zinc-500" : "text-brand-950/70"}`}>
                      {isAI ? "DEADLINE HERO AI" : "YOU"} &bull; {msg.timestamp}
                    </div>

                    <p className="whitespace-pre-wrap font-sans text-xs tracking-tight font-semibold leading-relaxed">
                      {msg.content}
                    </p>

                    {isAI && (
                      <button
                        id={`screen-speak-msg-${msg.id}`}
                        onClick={() => onSpeakText(msg.content)}
                        className="absolute right-2 top-2 p-1.5 rounded-md bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-brand-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Read aloud"
                      >
                        <Volume2 size={10} />
                      </button>
                    )}
                  </div>

                  {!isAI && (
                    <div className="w-7 h-7 rounded-lg bg-brand-500/10 border border-brand-500/25 flex items-center justify-center text-brand-500 shrink-0">
                      <User size={13} />
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>

        {isLoading && (
          <div className="flex justify-start items-start gap-2.5 animate-pulse">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-brand-500 shrink-0">
              <Bot size={13} />
            </div>
            <div className="bg-zinc-900/60 border border-white/5 rounded-2xl rounded-tl-none p-3.5 text-zinc-450 max-w-[80%] flex items-center gap-2">
              <div className="flex gap-1 shrink-0">
                <span className="h-1 w-1 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1 w-1 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1 w-1 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Optimizing schedule...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Message Form / Glowing Mic Bar */}
      <div className="space-y-2 shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
          <div className="flex-1 flex items-center gap-2 bg-zinc-950/60 border border-white/10 rounded-full px-4 py-2.5 focus-within:border-brand-500/50 focus-within:ring-1 focus-within:ring-brand-500/10 transition-all duration-300">
            <input
              id="coach-screen-textbox"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? "Transcribing speaking voice..." : "Ask coach or type details..."}
              disabled={isLoading || isListening}
              className="flex-1 bg-transparent border-none text-zinc-150 placeholder-zinc-500 text-xs focus:outline-none focus:ring-0 px-1 disabled:opacity-50 font-sans tracking-tight font-semibold"
            />
            <button
              id="coach-screen-send"
              type="submit"
              disabled={!inputText.trim() || isLoading || isListening}
              className="p-2 bg-brand-500 hover:bg-brand-400 disabled:bg-zinc-850/50 disabled:text-zinc-650 text-zinc-950 rounded-full transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(204,255,0,0.2)] disabled:shadow-none"
            >
              <Send size={12} />
            </button>
          </div>

          <button
            id="coach-screen-mic"
            type="button"
            onClick={toggleListening}
            className={`w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 shrink-0 border shadow ${
              isListening
                ? "bg-brand-500 border-brand-500 text-zinc-950 shadow-[0_0_15px_#ccff00] animate-pulse"
                : "bg-zinc-900/60 hover:bg-zinc-800 text-brand-500 border-brand-500/25 shadow-[0_0_10px_rgba(204,255,0,0.08)] hover:border-brand-500/50"
            }`}
            title={isListening ? "Stop voice listening" : "Stream voice input"}
          >
            <Mic size={16} />
          </button>
        </form>

        {/* Voice Feedback Status */}
        <AnimatePresence>
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[9px] font-mono text-zinc-400 px-3 py-1 bg-zinc-950/40 rounded-lg border border-white/5 flex items-center gap-1.5"
            >
              <AlertCircle size={10} className="text-brand-500 animate-pulse" />
              <span>{statusMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
