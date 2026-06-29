import { PlanStep } from "../types";
import { CheckCircle2, Circle, Clock, Flame, Play, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PlanPanelProps {
  plan: PlanStep[];
  onToggleComplete: (id: string) => void;
  onSelectAction: (step: PlanStep) => void;
  highlightedStepId: string | null;
}

export default function PlanPanel({
  plan,
  onToggleComplete,
  onSelectAction,
  highlightedStepId,
}: PlanPanelProps) {
  // Determine next actionable step (first incomplete step)
  const nextStep = plan.find((step) => !step.completed);
  const completedCount = plan.filter((step) => step.completed).length;
  const progressPercent = plan.length > 0 ? Math.round((completedCount / plan.length) * 100) : 0;

  return (
    <div 
      id="plan-panel-container" 
      className="flex flex-col h-full glass-panel rounded-3xl overflow-hidden shadow-2xl"
    >
      {/* Header with stats */}
      <div className="p-6 border-b border-white/5 bg-zinc-900/10 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-500/10 rounded-xl text-brand-500 border border-brand-500/15">
              <Flame size={18} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 tracking-tight font-display">
                Execution Queue
              </h2>
              <p className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">Today's Roadmap</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-zinc-950 bg-brand-500 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(204,255,0,0.25)]">
            {completedCount}/{plan.length} Resolved
          </span>
        </div>

        {/* Dynamic Progress Bar */}
        {plan.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-mono font-medium tracking-wider text-zinc-450">
              <span className="text-zinc-500 uppercase">Daily Velocity</span>
              <span className="text-brand-500 font-bold tracking-widest">{progressPercent}% SUCCESS</span>
            </div>
            <div className="w-full bg-zinc-950/60 h-3 rounded-full p-[1px] border border-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="bg-brand-500 h-full rounded-full shadow-[0_0_12px_#ccff00]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3.5 scrollbar-thin">
        <AnimatePresence mode="popLayout">
          {plan.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col items-center justify-center text-center py-16 px-4 h-full"
            >
              <div className="p-4 bg-zinc-900/40 rounded-2xl border border-white/10 text-zinc-500 mb-4 shadow-inner">
                <Sparkles size={28} className="text-brand-500/80 animate-pulse" />
              </div>
              <h3 className="text-zinc-200 font-bold text-sm tracking-tight mb-1.5 font-display">No objectives loaded</h3>
              <p className="text-zinc-500 text-xs max-w-[240px] leading-relaxed font-sans">
                Provide a project, task, or direct deadline. I will structure a clear chronological tactical map.
              </p>
            </motion.div>
          ) : (
            plan.map((step, index) => {
              const isNext = nextStep?.id === step.id;
              const isHighlighted = highlightedStepId === step.id;

              return (
                <motion.div
                  key={step.id}
                  id={`step-card-${step.id}`}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: isHighlighted ? 1.015 : 1,
                  }}
                  exit={{ opacity: 0, y: -12 }}
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  className={`relative p-4 rounded-2xl border flex items-start gap-4 transition-all duration-300 ${
                    step.completed
                      ? "bg-zinc-950/20 border-white/5 opacity-40"
                      : isHighlighted
                      ? "bg-brand-500/[0.04] border-brand-500/80 shadow-[0_0_20px_rgba(204,255,0,0.18)] glow-active-card"
                      : isNext
                      ? "bg-zinc-850/80 border-white/15 shadow-[0_4px_12px_rgba(0,0,0,0.2)] animate-glow"
                      : "bg-zinc-900/20 border-white/5 hover:border-white/15"
                  }`}
                >
                  {/* Complete/Incomplete Toggle */}
                  <button
                    id={`step-toggle-${step.id}`}
                    onClick={() => onToggleComplete(step.id)}
                    className="mt-0.5 focus:outline-none flex-shrink-0 cursor-pointer text-zinc-550 hover:text-brand-500 transition-colors"
                  >
                    {step.completed ? (
                      <CheckCircle2 size={19} className="text-brand-500 filter drop-shadow-[0_0_4px_rgba(204,255,0,0.4)]" />
                    ) : (
                      <Circle
                        size={19}
                        className={`transition-colors ${
                          isNext ? "text-brand-500 hover:text-brand-400" : "text-zinc-600 hover:text-zinc-450"
                        }`}
                      />
                    )}
                  </button>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {isNext && !step.completed && (
                        <span className="text-[8px] font-extrabold tracking-wider bg-brand-500/10 text-brand-500 px-2 py-0.5 rounded border border-brand-500/20 uppercase font-mono">
                          Next Action
                        </span>
                      )}
                      {step.completed && (
                        <span className="text-[8px] font-extrabold tracking-wider bg-zinc-800/80 text-zinc-500 px-2 py-0.5 rounded uppercase font-mono">
                          Complete
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 font-medium">
                        <Clock size={10} className="text-zinc-600" />
                        <span>{step.timeSlot}</span>
                      </div>
                    </div>

                    <h4
                      className={`text-sm font-semibold leading-relaxed tracking-tight font-sans ${
                        step.completed ? "line-through text-zinc-600" : "text-zinc-100"
                      }`}
                    >
                      {step.name}
                    </h4>
                  </div>

                  {/* Time Estimate Badge & Action Highlightor */}
                  <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0 gap-3">
                    <span className="text-[10px] font-mono font-bold text-zinc-300 bg-zinc-800/60 px-2.5 py-1 rounded-lg border border-white/5">
                      {step.timeEstimate}
                    </span>

                    {!step.completed && (
                      <button
                        id={`step-action-btn-${step.id}`}
                        onClick={() => onSelectAction(step)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          isNext 
                            ? "bg-brand-500/10 border-brand-500/20 text-brand-500 hover:bg-brand-500/20" 
                            : "bg-zinc-800/60 border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                        }`}
                        title="Highlight & Focus action"
                      >
                        <Play size={10} fill="currentColor" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
