import { useState, useEffect, useCallback } from "react";
import { PlanStep, ChatMessage, ChatResponse } from "./types";
import TodayPlanScreen from "./components/TodayPlanScreen";
import AICoachScreen from "./components/AICoachScreen";
import DailySummaryScreen from "./components/DailySummaryScreen";
import { Clock, Flame, RotateCcw, Calendar, MessageSquare, Trophy, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Initial greeting from Deadline Hero AI
const getInitialMessages = (): ChatMessage[] => [
  {
    id: "welcome-msg",
    role: "assistant",
    content: "Welcome to your Deadline Hero coach. I don't care about logging lists; I care about you FINISHING. What project, goal, or deadline are you battling today? Describe it or say it below, and I will draft a live tactical schedule.",
    timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
  },
];

export default function App() {
  const [plan, setPlan] = useState<PlanStep[]>(() => {
    const saved = localStorage.getItem("deadline_hero_plan");
    return saved ? JSON.parse(saved) : [];
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("deadline_hero_messages");
    return saved ? JSON.parse(saved) : getInitialMessages();
  });

  const [currentReasoning, setCurrentReasoning] = useState<string | null>(() => {
    return localStorage.getItem("deadline_hero_reasoning") || null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [lastAiResponseText, setLastAiResponseText] = useState<string | null>(null);
  const [highlightedStepId, setHighlightedStepId] = useState<string | null>(null);
  const [streak, setStreak] = useState<number>(() => {
    const saved = localStorage.getItem("deadline_hero_streak");
    return saved ? parseInt(saved) : 3; // Start with a friendly motivational streak!
  });

  // Current Screen / Tab view selection
  const [activeTab, setActiveTab] = useState<"plan" | "coach" | "summary">("plan");

  // Persist App state
  useEffect(() => {
    localStorage.setItem("deadline_hero_plan", JSON.stringify(plan));
  }, [plan]);

  useEffect(() => {
    localStorage.setItem("deadline_hero_messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (currentReasoning) {
      localStorage.setItem("deadline_hero_reasoning", currentReasoning);
    } else {
      localStorage.removeItem("deadline_hero_reasoning");
    }
  }, [currentReasoning]);

  useEffect(() => {
    localStorage.setItem("deadline_hero_streak", streak.toString());
  }, [streak]);

  // Handle checking/unchecking task step
  const handleToggleComplete = useCallback((id: string) => {
    setPlan((prevPlan) => {
      const updated = prevPlan.map((step) => {
        if (step.id === id) {
          const newState = !step.completed;
          // Celebrate with voice output if task is checked off
          if (newState && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            const congrats = new SpeechSynthesisUtterance("Step completed! Excellent pace.");
            congrats.rate = 1.1;
            window.speechSynthesis.speak(congrats);
          }
          return { ...step, completed: newState };
        }
        return step;
      });

      // If all steps are now finished, award a streak point and say congrats
      const allDone = updated.length > 0 && updated.every((s) => s.completed);
      if (allDone) {
        setStreak((prev) => prev + 1);
        if ("speechSynthesis" in window) {
          setTimeout(() => {
            window.speechSynthesis.cancel();
            const finalCongrats = new SpeechSynthesisUtterance("Incredible focus! You finished the entire plan. Streak increased!");
            finalCongrats.rate = 1.05;
            window.speechSynthesis.speak(finalCongrats);
          }, 1200);
        }
      }

      return updated;
    });
  }, []);

  // Highlight a specific action & speak it out
  const handleSelectAction = useCallback((step: PlanStep) => {
    setHighlightedStepId(step.id);
    
    // Announce via TTS
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        `Your next target is: ${step.name}. Estimated time: ${step.timeEstimate}. Focus solely on this action.`
      );
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // "What should I do now?" Highlight logic
  const handleHighlightNextAction = useCallback(() => {
    if (plan.length === 0) {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(
          "You don't have an active plan yet. Tell me what you need to finish on the AI Coach tab, and I will outline your next moves."
        );
        window.speechSynthesis.speak(utterance);
      }
      return;
    }

    const nextStep = plan.find((step) => !step.completed);
    if (nextStep) {
      handleSelectAction(nextStep);
    } else {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(
          "Outstanding! All steps in today's plan are fully completed. You've earned a break or can outline your next goal."
        );
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [plan, handleSelectAction]);

  // Submit text or spoken prompt to full-stack Express backend
  const handleSendMessage = useCallback(async (text: string) => {
    if (isLoading) return;

    // Add User Message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setHighlightedStepId(null); // Reset highlight on new turn

    try {
      // Calculate current user locale formatted string for Gemini context
      const currentTimeString = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }) + ` (${new Date().toLocaleDateString("en-US", { weekday: "long" })})`;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          currentPlan: plan,
          chatHistory: messages,
          currentTimeString,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server API returned status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();

      // Formulate AI Message
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.aiMessage,
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
        reasoning: data.reasoning,
      };

      setMessages((prev) => [...prev, aiMsg]);
      
      // Update local plan state, keeping the original completed status if IDs match
      const mergedPlan = data.plan.map((newStep) => {
        const existing = plan.find((s) => s.id === newStep.id || s.name.toLowerCase() === newStep.name.toLowerCase());
        return {
          ...newStep,
          completed: existing ? existing.completed : false,
        };
      });

      setPlan(mergedPlan);
      setCurrentReasoning(data.reasoning);
      setLastAiResponseText(data.aiMessage); // Triggers Speech Synthesis

    } catch (error) {
      console.error("Failed to query coach api:", error);
      
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "I hit an error communicating with my planning matrix. Let's try that again.",
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
        reasoning: "Express server-side route `/api/chat` failed to complete Google GenAI API request successfully.",
      };

      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [plan, messages, isLoading]);

  // Read message directly
  const handleSpeakText = useCallback((text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*_#`\[\]]/g, "");
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Quick reset to wipe state
  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset your coaching plan? This starts a fresh goal.")) {
      setPlan([]);
      setMessages(getInitialMessages());
      setCurrentReasoning(null);
      setHighlightedStepId(null);
      setLastAiResponseText(null);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  };

  return (
    <div id="deadline-hero-app" className="h-full min-h-[100dvh] w-full bg-[#050905] text-zinc-100 flex flex-col font-sans antialiased selection:bg-brand-500/30 selection:text-white overflow-hidden relative">
      
      {/* Immersive Sci-Fi Background Glow Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-500/[0.03] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-brand-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container taking up full dimensions */}
      <div className="w-full flex-1 flex flex-col bg-[#0a0f0a]/90 backdrop-blur-sm overflow-hidden relative">
        
        {/* Consistent Top Header Bar */}
        <header className="border-b border-white/5 bg-[#0e150e]/60 backdrop-blur-md shrink-0">
          <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6.5 h-6.5 bg-brand-500 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(204,255,0,0.35)] shrink-0">
                <Clock size={12} className="text-zinc-950" fill="currentColor" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xs sm:text-sm font-black tracking-tight text-zinc-100 font-display">
                    Deadline Hero
                  </h1>
                  <span className="text-[7.5px] font-extrabold tracking-widest bg-brand-500/10 text-brand-500 px-1.5 py-0.5 rounded-full border border-brand-500/20 uppercase font-mono scale-90 origin-left">
                    AI COACH
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Focus Streak Counter Badge */}
              <div className="flex items-center gap-1 bg-zinc-950/40 border border-white/5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-mono shadow-[0_0_10px_rgba(204,255,0,0.03)]">
                <Flame size={11} className="text-orange-500 fill-orange-500 animate-pulse" />
                <span className="text-zinc-400 font-medium">Streak:</span>
                <span className="text-brand-500 font-extrabold">{streak}d</span>
              </div>

              {/* Quick Reset Button */}
              <button
                id="phone-reset-btn"
                onClick={handleReset}
                className="p-1.5 bg-zinc-900/40 hover:bg-zinc-800 border border-white/5 text-zinc-500 hover:text-zinc-100 rounded-full transition-colors cursor-pointer"
                title="Reset current planning roadmap"
              >
                <RotateCcw size={11} />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Viewport (Tab Switcher Screen Pane) */}
        <div className="flex-1 min-h-0 w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 md:py-6 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeTab === "plan" && (
              <motion.div
                key="plan-tab"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="h-full w-full"
              >
                <TodayPlanScreen
                  plan={plan}
                  onToggleComplete={handleToggleComplete}
                  onSelectAction={handleSelectAction}
                  highlightedStepId={highlightedStepId}
                  onHighlightNextAction={handleHighlightNextAction}
                />
              </motion.div>
            )}

            {activeTab === "coach" && (
              <motion.div
                key="coach-tab"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="h-full w-full"
              >
                <AICoachScreen
                  messages={messages}
                  currentReasoning={currentReasoning}
                  isLoading={isLoading}
                  onSendMessage={handleSendMessage}
                  onSpeakText={handleSpeakText}
                  plan={plan}
                  streak={streak}
                />
              </motion.div>
            )}

            {activeTab === "summary" && (
              <motion.div
                key="summary-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="h-full w-full"
              >
                <DailySummaryScreen
                  plan={plan}
                  chatHistory={messages}
                  streak={streak}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Device Bottom Tab Navigation Bar */}
        <nav className="border-t border-white/5 bg-zinc-950/95 shrink-0 pb-5 sm:pb-4 pt-3 mt-auto">
          <div className="max-w-4xl mx-auto w-full px-6 flex items-center justify-around">
            {/* Today's Plan Tab Button */}
            <button
              id="tab-btn-plan"
              onClick={() => setActiveTab("plan")}
              className={`flex flex-col items-center gap-1 focus:outline-none transition-all cursor-pointer relative group ${
                activeTab === "plan" ? "text-brand-500 scale-105" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Calendar size={18} className={activeTab === "plan" ? "filter drop-shadow-[0_0_3px_#ccff00]" : ""} />
              <span className="text-[8.5px] font-mono font-bold tracking-widest">PLAN</span>
              {activeTab === "plan" && (
                <motion.span
                  layoutId="active-tab-indicator"
                  className="absolute -bottom-1.5 w-1 h-1 bg-brand-500 rounded-full shadow-[0_0_6px_#ccff00]"
                />
              )}
            </button>

            {/* AI Coach Tab Button */}
            <button
              id="tab-btn-coach"
              onClick={() => setActiveTab("coach")}
              className={`flex flex-col items-center gap-1 focus:outline-none transition-all cursor-pointer relative group ${
                activeTab === "coach" ? "text-brand-500 scale-105" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <MessageSquare size={18} className={activeTab === "coach" ? "filter drop-shadow-[0_0_3px_#ccff00]" : ""} />
              <span className="text-[8.5px] font-mono font-bold tracking-widest">AI COACH</span>
              {activeTab === "coach" && (
                <motion.span
                  layoutId="active-tab-indicator"
                  className="absolute -bottom-1.5 w-1 h-1 bg-brand-500 rounded-full shadow-[0_0_6px_#ccff00]"
                />
              )}
            </button>

            {/* Daily Summary Tab Button */}
            <button
              id="tab-btn-summary"
              onClick={() => setActiveTab("summary")}
              className={`flex flex-col items-center gap-1 focus:outline-none transition-all cursor-pointer relative group ${
                activeTab === "summary" ? "text-brand-500 scale-105" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Trophy size={18} className={activeTab === "summary" ? "filter drop-shadow-[0_0_3px_#ccff00]" : ""} />
              <span className="text-[8.5px] font-mono font-bold tracking-widest">SUMMARY</span>
              {activeTab === "summary" && (
                <motion.span
                  layoutId="active-tab-indicator"
                  className="absolute -bottom-1.5 w-1 h-1 bg-brand-500 rounded-full shadow-[0_0_6px_#ccff00]"
                />
              )}
            </button>
          </div>
        </nav>

      </div>
    </div>
  );
}
