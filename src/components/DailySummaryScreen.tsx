import { useState, useEffect, useCallback, useMemo } from "react";
import { PlanStep, ChatMessage } from "../types";
import { Sparkles, Clock, Trophy, RefreshCw, Volume2, Target, CheckCircle2, AlertCircle, VolumeX, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DailySummaryScreenProps {
  plan: PlanStep[];
  chatHistory: ChatMessage[];
  streak: number;
}

interface SummaryData {
  summaryMessage: string;
  topWin: string;
  tomorrowPriorities: string[];
}

const parseTimeToMinutes = (timeStr: string): number => {
  const clean = timeStr.toLowerCase().trim();
  if (clean.includes("hour") || clean.includes("hr")) {
    const match = clean.match(/([\d.]+)/);
    if (match) return parseFloat(match[1]) * 60;
  }
  const match = clean.match(/([\d.]+)/);
  if (match) return parseFloat(match[1]);
  return 20; // default to 20 mins
};

export default function DailySummaryScreen({ plan, chatHistory, streak }: DailySummaryScreenProps) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Local stats
  const completedCount = useMemo(() => plan.filter((s) => s.completed).length, [plan]);
  const totalCount = plan.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Focus duration
  const focusTimeStr = useMemo(() => {
    const mins = plan
      .filter((s) => s.completed)
      .reduce((sum, s) => sum + parseTimeToMinutes(s.timeEstimate), 0);
    
    if (mins === 0) return "0 mins";
    if (mins < 60) return `${mins} mins`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs} hrs`;
  }, [plan]);

  // Productivity Score out of 100
  const productivityScore = useMemo(() => {
    if (totalCount === 0) return 0;
    const base = (completedCount / totalCount) * 100;
    const bonus = Math.min(streak * 2, 10);
    return Math.min(Math.round(base + bonus), 100);
  }, [completedCount, totalCount, streak]);

  // Score label mapper
  const scoreLabel = useMemo(() => {
    if (productivityScore >= 90) return "OPTIMIZED";
    if (productivityScore >= 75) return "HIGHLY EFFICIENT";
    if (productivityScore >= 50) return "FOCUSED PACE";
    if (productivityScore > 0) return "INITIAL MOMENTUM";
    return "TACTICAL COOLDOWN";
  }, [productivityScore]);

  const pendingSteps = useMemo(() => plan.filter((s) => !s.completed), [plan]);

  const cacheKey = useMemo(() => {
    const stepIdsString = plan.map((s) => `${s.id}-${s.completed}`).join("|");
    return `deadline_hero_tab_summary_cache_${stepIdsString}`;
  }, [plan]);

  const fetchSummary = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          setSummary(JSON.parse(cached));
          setError(null);
          return;
        } catch (e) {
          localStorage.removeItem(cacheKey);
        }
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPlan: plan,
          chatHistory: chatHistory,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status: ${res.status}`);
      }

      const data = await res.json();
      const summaryData: SummaryData = {
        summaryMessage: data.summaryMessage,
        topWin: data.topWin,
        tomorrowPriorities: data.tomorrowPriorities,
      };

      setSummary(summaryData);
      localStorage.setItem(cacheKey, JSON.stringify(summaryData));
    } catch (err: any) {
      console.error("Failed to fetch summary:", err);
      setError("Fallback heuristics loaded.");
      
      const topCompleted = plan.find(s => s.completed)?.name || "Task structure optimization";
      const fallbackData: SummaryData = {
        summaryMessage: completedCount > 0 
          ? `You attacked today's sprints with persistent momentum. Resolving ${completedCount} tactical elements shows discipline. Build on this tomorrow.`
          : "Today was an planning phase. Clear the decision blocks and commit to direct action items first thing tomorrow morning.",
        topWin: completedCount > 0 
          ? `Completing: "${topCompleted}"` 
          : "Persisting through cognitive overload and mapping chronological goals.",
        tomorrowPriorities: [
          "Crush your remaining unresolved task milestones with morning slots.",
          "Prevent context switching and allocate a single block to the spotlight target.",
          "Sync with your coach to scale down task parameters if feeling blocked."
        ]
      };
      setSummary(fallbackData);
    } finally {
      setIsLoading(false);
    }
  }, [plan, chatHistory, cacheKey, completedCount]);

  useEffect(() => {
    fetchSummary();
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [fetchSummary]);

  const handleSpeakSummary = () => {
    if (!summary || !("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = `${summary.summaryMessage} Today's top win was: ${summary.topWin}`;
    const clean = textToSpeak.replace(/[*_#`\[\]]/g, "");
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05;
    
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // SVG parameters for circular score ring
  const strokeWidth = 8;
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (productivityScore / 100) * circumference;

  return (
    <div id="screen-daily-summary" className="flex flex-col h-full space-y-5 overflow-y-auto pr-1 pb-4 scrollbar-thin">
      
      {/* Title block with refresh trigger */}
      <div className="flex items-center justify-between px-1 shrink-0">
        <div>
          <span className="text-[9px] font-mono font-extrabold tracking-widest text-brand-500 uppercase block">Focus Report</span>
          <h2 className="text-base font-black text-zinc-100 tracking-tight font-display">Daily Summary</h2>
        </div>
        
        <button
          id="summary-screen-refresh"
          onClick={() => fetchSummary(true)}
          disabled={isLoading}
          className="p-2 text-zinc-400 hover:text-brand-500 hover:bg-zinc-900 rounded-full transition-all cursor-pointer disabled:opacity-50 border border-white/5 bg-zinc-950/20"
          title="Force update with Gemini AI Analysis"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin text-brand-500" : ""} />
        </button>
      </div>

      {/* Giant Circular Score Section */}
      <div className="bg-zinc-950/45 border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden shrink-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-brand-500/[0.01] to-transparent pointer-events-none" />

        {/* Circular SVG Meter */}
        <div className="relative w-36 h-36 flex items-center justify-center mb-3">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background Circle */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              stroke="rgba(255, 255, 255, 0.04)"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Animated Progress Circle */}
            <motion.circle
              cx="72"
              cy="72"
              r={radius}
              stroke="#ccff00"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              strokeLinecap="round"
              fill="transparent"
              className="drop-shadow-[0_0_10px_rgba(204,255,0,0.45)]"
            />
          </svg>

          {/* Core Content Inside Ring */}
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-zinc-100 tracking-tighter">
              {productivityScore}
            </span>
            <span className="text-[7.5px] font-mono font-bold text-zinc-500 tracking-wider uppercase mt-0.5">
              SCORE
            </span>
          </div>
        </div>

        {/* Score description badge */}
        <h3 className="text-xs font-black tracking-widest text-zinc-300 font-mono uppercase mb-2">
          {scoreLabel}
        </h3>

        {/* AI Optimized pill tag */}
        <div className="flex items-center gap-1.5 bg-brand-500/10 border border-brand-500/25 px-3 py-1 rounded-full">
          <Sparkles size={11} className="text-brand-500 animate-pulse" />
          <span className="text-[8.5px] font-mono font-extrabold text-brand-500 uppercase tracking-widest">
            AI Optimized Report
          </span>
        </div>
      </div>

      {/* Two Grid Cards: Resolved and Focus Time */}
      <div className="grid grid-cols-2 gap-4 shrink-0">
        <div className="bg-zinc-950/45 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 bg-brand-500/10 rounded-xl text-brand-500 border border-brand-500/15 shrink-0">
            <Target size={15} />
          </div>
          <div>
            <span className="text-[8.5px] font-mono text-zinc-500 tracking-wider uppercase block font-semibold">RESOLVED</span>
            <span className="text-sm font-extrabold text-zinc-200 mt-0.5 block">
              {completedCount} <span className="text-zinc-600 text-xs">/ {totalCount}</span>
            </span>
          </div>
        </div>

        <div className="bg-zinc-950/45 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 bg-brand-500/10 rounded-xl text-brand-500 border border-brand-500/15 shrink-0">
            <Clock size={15} />
          </div>
          <div>
            <span className="text-[8.5px] font-mono text-zinc-500 tracking-wider uppercase block font-semibold">FOCUS DURATION</span>
            <span className="text-sm font-extrabold text-zinc-200 mt-0.5 block truncate">
              {focusTimeStr}
            </span>
          </div>
        </div>
      </div>

      {/* Coach Message Container (with Speak Assist) */}
      <div className="bg-brand-500/[0.03] border border-brand-500/15 rounded-3xl p-5 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-brand-500" />
            <span className="text-[9px] font-mono font-bold tracking-widest text-brand-500 uppercase">
              AI COACH SUMMARY
            </span>
          </div>

          {summary && (
            <button
              id="summary-screen-tts"
              onClick={handleSpeakSummary}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isSpeaking
                  ? "bg-brand-500 border-brand-500 text-zinc-950 shadow-[0_0_8px_#ccff00]"
                  : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-brand-500"
              }`}
              title={isSpeaking ? "Stop voice briefing" : "Listen to audio report"}
            >
              {isSpeaking ? <VolumeX size={11} /> : <Volume2 size={11} />}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2 py-1">
            <div className="h-3.5 bg-zinc-800/40 rounded animate-pulse w-full" />
            <div className="h-3.5 bg-zinc-800/40 rounded animate-pulse w-11/12" />
            <div className="h-3.5 bg-zinc-800/40 rounded animate-pulse w-4/5" />
          </div>
        ) : error && !summary ? (
          <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold py-1">
            <ShieldAlert size={14} />
            <span>{error}</span>
          </div>
        ) : (
          <p className="text-zinc-200 text-xs leading-relaxed font-sans font-semibold">
            {summary?.summaryMessage}
          </p>
        )}
      </div>

      {/* Top Win panel */}
      <div className="bg-zinc-950/45 border border-white/5 rounded-3xl p-4.5 space-y-2 shrink-0">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Trophy size={13} className="text-brand-500" />
          <h3 className="text-xs font-bold text-zinc-300 font-display">Primary Victory Today</h3>
        </div>
        {isLoading ? (
          <div className="h-9 bg-zinc-800/20 rounded animate-pulse w-full" />
        ) : (
          <p className="text-zinc-300 text-xs leading-relaxed font-sans font-semibold">
            {summary?.topWin}
          </p>
        )}
      </div>

      {/* Tomorrow's Top 3 Priorities preview */}
      <div className="bg-zinc-950/50 border border-white/5 rounded-3xl p-5 space-y-3.5 shrink-0">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
          <Target size={13} className="text-brand-500" />
          <h3 className="text-xs font-bold text-zinc-200 font-display">Tomorrow's Tactical Blueprint</h3>
        </div>

        {isLoading ? (
          <div className="space-y-2 py-1">
            <div className="h-3 bg-zinc-800/30 rounded animate-pulse w-5/6" />
            <div className="h-3 bg-zinc-800/30 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-zinc-800/30 rounded animate-pulse w-4/5" />
          </div>
        ) : (
          <ol className="space-y-3">
            {summary?.tomorrowPriorities.map((item, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex items-center justify-center w-5 h-5 bg-brand-500/10 text-brand-500 text-[9px] font-mono font-bold rounded border border-brand-500/15 shrink-0 mt-0.5">
                  0{index + 1}
                </span>
                <p className="text-zinc-300 text-xs font-semibold leading-relaxed font-sans">
                  {item}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Pending Items panel (for completeness, so they see what's still left) */}
      {pendingSteps.length > 0 && (
        <div className="bg-zinc-950/45 border border-white/5 rounded-3xl p-4.5 space-y-2 shrink-0">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <CheckCircle2 size={13} className="text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-300 font-display">Unresolved Items Today ({pendingSteps.length})</h3>
          </div>
          <ul className="space-y-1.5 max-h-24 overflow-y-auto scrollbar-thin">
            {pendingSteps.slice(0, 3).map((step) => (
              <li key={step.id} className="text-zinc-400 text-xs flex items-center gap-1.5 truncate font-sans font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
                <span className="truncate">{step.name}</span>
                <span className="text-[9px] font-mono text-zinc-550 ml-auto shrink-0">{step.timeEstimate}</span>
              </li>
            ))}
            {pendingSteps.length > 3 && (
              <li className="text-[9.5px] font-mono text-zinc-500 italic pl-3">
                + {pendingSteps.length - 3} more pending elements
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
