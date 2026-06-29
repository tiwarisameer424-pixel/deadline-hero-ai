import { useState, useEffect, useRef, FormEvent } from "react";
import { Mic, Send, Volume2, VolumeX, Radio } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface VoiceCoachProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  lastAiResponseText: string | null;
}

export default function VoiceCoach({
  onSendMessage,
  isLoading,
  lastAiResponseText,
}: VoiceCoachProps) {
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize Speech Web APIs
  useEffect(() => {
    // 1. Speech Recognition Setup
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
          // Auto-send voice input for zero-friction coaching
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
          setStatusMessage("Microphone permission denied. Please allow microphone access in your browser's address bar to use voice commands, or type your tasks directly below!");
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

    // 2. Speech Synthesis Setup
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

  // Read out loud when AI speaks new message
  useEffect(() => {
    if (lastAiResponseText && !isMuted && voiceSupported && synthesisRef.current) {
      // Stop current talking first
      synthesisRef.current.cancel();

      const cleanedText = lastAiResponseText.replace(/[*_#`\[\]]/g, ""); // strip markdown
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      
      // Select a nice clear english voice if available
      const voices = synthesisRef.current.getVoices();
      const idealVoice = voices.find(
        (v) =>
          v.lang.includes("en-US") &&
          (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha"))
      );
      if (idealVoice) {
        utterance.voice = idealVoice;
      }
      
      utterance.rate = 1.05; // Slightly faster for an alert, energetic tone
      utterance.pitch = 1.0;
      
      currentUtteranceRef.current = utterance;
      synthesisRef.current.speak(utterance);
    }
  }, [lastAiResponseText, isMuted, voiceSupported]);

  // Handle manual input form submit
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText("");
    setStatusMessage(null);
  };

  // Toggle Speech Recognition
  const toggleListening = () => {
    if (!speechSupported) {
      setStatusMessage("Web Speech API not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // Stop current voice readout if speaking
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Start speech failed:", err);
      }
    }
  };

  // Toggle Mute of Voice synthesis
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted && synthesisRef.current) {
      synthesisRef.current.cancel(); // shut up immediately
    }
  };

  return (
    <div 
      id="voice-coach-container" 
      className="glass-panel p-6 rounded-3xl shadow-2xl flex flex-col gap-4"
    >
      {/* Top action info & state */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-brand-500/10 rounded border border-brand-500/15 text-brand-500">
            <Radio size={13} className="animate-pulse" />
          </div>
          <span className="text-[10px] font-extrabold tracking-wider text-zinc-400 font-mono uppercase">
            Coach Transmission Active
          </span>
        </div>
        
        {/* Voice Feedback Control */}
        {voiceSupported && (
          <button
            id="voice-mute-toggle"
            type="button"
            onClick={toggleMute}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold font-mono border cursor-pointer transition-all duration-200 ${
              isMuted
                ? "bg-zinc-800/40 border-white/5 text-zinc-450 hover:text-zinc-300"
                : "bg-brand-500/10 border-brand-500/20 text-brand-500 hover:bg-brand-500/20 shadow-[0_0_10px_rgba(204,255,0,0.1)]"
            }`}
          >
            {isMuted ? (
              <>
                <VolumeX size={13} />
                <span>VOICE MUTED</span>
              </>
            ) : (
              <>
                <Volume2 size={13} className="animate-pulse" />
                <span>VOICE SYNTH ON</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main voice input block */}
      <form 
        onSubmit={handleSubmit} 
        className="relative flex items-center gap-3 w-full"
      >
        {/* Text Input Container (pill-shaped) */}
        <div className="flex-1 flex items-center gap-2 bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-full px-5 py-3 focus-within:border-brand-500/60 focus-within:ring-2 focus-within:ring-brand-500/10 transition-all duration-300">
          <input
            id="voice-input-textbox"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isListening
                ? "Transcribing voice..."
                : speechSupported
                ? "Ask coach or negotiate goals..."
                : "Ask coach or negotiate goals..."
            }
            disabled={isLoading || isListening}
            className="flex-1 bg-transparent border-none text-zinc-105 placeholder-zinc-500 text-sm focus:outline-none focus:ring-0 px-1 disabled:opacity-50 font-sans tracking-tight font-medium"
          />
          
          {/* Send Submit Button (integrated inside the pill text field) */}
          <button
            id="send-message-btn"
            type="submit"
            disabled={!inputText.trim() || isLoading || isListening}
            className="p-2.5 bg-brand-500 hover:bg-brand-400 disabled:bg-zinc-800/50 disabled:text-zinc-650 text-zinc-950 rounded-full transition-all cursor-pointer flex items-center justify-center shrink-0 border border-transparent shadow-[0_2px_8px_rgba(204,255,0,0.25)] disabled:shadow-none"
          >
            <Send size={14} />
          </button>
        </div>

        {/* Glowing circular mic button on the right */}
        <button
          id="speech-recognition-btn"
          type="button"
          onClick={toggleListening}
          className={`relative w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 shrink-0 border shadow-lg ${
            isListening
              ? "bg-brand-500 border-brand-500 text-zinc-950 shadow-[0_0_20px_#ccff00] ai-pulse"
              : "bg-zinc-900/60 hover:bg-zinc-800 text-brand-500 border-brand-500/30 hover:border-brand-500/50 shadow-[0_0_12px_rgba(204,255,0,0.12)]"
          }`}
          title={isListening ? "Stop listening" : "Speak your task/obstacle"}
        >
          <Mic size={22} className={isListening ? "animate-pulse" : ""} />
        </button>
      </form>

      {/* Dynamic Status Bar */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-[10px] font-mono font-medium text-zinc-300 px-3 bg-zinc-950/20 py-1.5 rounded-lg border border-white/5"
          >
            {statusMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
