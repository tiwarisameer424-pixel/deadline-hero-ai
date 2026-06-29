import { PlanStep } from "../types";
import { CheckCircle2, Circle, Clock, Flame, Play, Sparkles, Volume2, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useMemo } from "react";

interface TodayPlanScreenProps {
  plan: PlanStep[];
  onToggleComplete: (id: string) => void;
  onSelectAction: (step: PlanStep) => void;
  highlightedStepId: string | null;
  onHighlightNextAction: () => void;
}

export default function TodayPlanScreen({
  plan,
  onToggleComplete,
  onSelectAction,
  highlightedStepId,
  onHighlightNextAction,
}: TodayPlanScreenProps) {
  // Determine the next actionable step (first incomplete step)
  const nextStep = useMemo(() => plan.find((step) => !step.completed), [plan]);

  // Determine which step is currently spotlighted/active
  const activeStep = useMemo(() => {
    if (plan.length === 0) return null;
    if (highlightedStepId) {
      const found = plan.find((step) => step.id === highlightedStepId);
      if (found && !found.completed) return found;
    }
    return nextStep || null;
  }, [plan, highlightedStepId, nextStep]);

  const completedCount = useMemo(() => plan.filter((step) => step.completed).length, [plan]);
  const totalCount = plan.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Complexity mapper based on step name length or random seed
  const getComplexity = (name: string): "Low" | "Medium" | "High" => {
    const len = name.length;
    if (len % 3 === 0) return "High";
    if (len % 3 === 1) return "Medium";
    return "Low";
  };

  return (
    <div id="screen-todays-plan" className="flex flex-col h-full space-y-5 overflow-hidden">
      
      {/* Header and Velocity Section */}
      <div className="bg-zinc-950/45 backdrop-blur-md border border-white/5 rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-500/10 rounded-2xl text-brand-500 border border-brand-500/15">
              <Flame size={18} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-100 tracking-tight font-display">
                Tactical Horizon
              </h2>
              <p className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase font-semibold">Today's Active Sprints</p>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono font-bold text-zinc-950 bg-brand-500 px-3 py-1 rounded-full shadow-[0_0_12px_rgba(204,255,0,0.3)]">
              {completedCount}/{totalCount} Resolved
            </span>
          </div>
        </div>

        {/* Dynamic Velocity rate bar */}
        {totalCount > 0 ? (
          <div className="space-y-2 pt-1">
            <div className="flex justify-between text-[10px] font-mono font-medium tracking-wider text-zinc-400 uppercase">
              <span>Execution Velocity</span>
              <span className="text-brand-500 font-bold tracking-widest">{progressPercent}% COMPLETED</span>
            </div>
            <div className="w-full bg-zinc-950 h-2.5 rounded-full p-[1px] border border-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="bg-brand-500 h-full rounded-full shadow-[0_0_12px_#ccff00]"
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic font-medium pt-1">
            No active milestones loaded. State your targets in AI Coach to generate a roadmap.
          </p>
        )}
      </div>

      {/* Active Sequence Spotlight Box */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-extrabold tracking-widest text-zinc-500 uppercase font-mono px-1">
          Active Sequence (Spotlight)
        </h3>

        <AnimatePresence mode="wait">
          {!activeStep ? (
            <motion.div
              key="no-active"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-panel p-5 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center py-8"
            >
              <div className="p-3 bg-zinc-900/40 rounded-2xl border border-white/5 text-zinc-650 mb-3">
                <Sparkles size={20} className="text-zinc-600" />
              </div>
              <h4 className="text-zinc-300 font-bold text-xs tracking-tight mb-1 font-display">No active target isolate</h4>
              <p className="text-zinc-500 text-[11px] max-w-[240px] leading-relaxed mb-3">
                {totalCount > 0 
                  ? "All objectives are finished! Or you can manually highlight any item below."
                  : "Draft your goal in the AI Coach page to isolate priorities."}
              </p>
              {totalCount > 0 && (
                <button
                  id="screen-select-next-btn"
                  onClick={onHighlightNextAction}
                  className="px-4 py-2 bg-brand-500/10 hover:bg-brand-500 text-brand-500 hover:text-zinc-950 border border-brand-500/20 rounded-full text-[10px] font-mono font-bold uppercase transition-all shadow-[0_0_10px_rgba(204,255,0,0.1)] cursor-pointer"
                >
                  Highlight Next Action
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={activeStep.id}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              className="relative p-5 rounded-3xl border border-brand-500/30 bg-gradient-to-br from-brand-500/[0.04] via-zinc-950/20 to-zinc-950/40 shadow-[0_0_25px_rgba(204,255,0,0.15)] overflow-hidden"
            >
              {/* Pulse accent behind next action */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/[0.03] rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[8px] font-black tracking-widest bg-brand-500 text-zinc-950 px-2.5 py-0.5 rounded-full uppercase font-mono shadow-[0_0_8px_rgba(204,255,0,0.3)]">
                      Spotlight Target
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-450 font-semibold">
                      <Clock size={10} className="text-brand-500 animate-pulse" />
                      <span>{activeStep.timeSlot}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-zinc-100 tracking-tight leading-snug font-sans">
                    {activeStep.name}
                  </h3>

                  {/* Detail stats (remaining time, complexity) */}
                  <div className="flex items-center gap-4 pt-1.5 border-t border-white/5">
                    <div>
                      <span className="text-[9px] text-zinc-500 font-mono tracking-wider uppercase block">Duration</span>
                      <span className="text-xs font-mono font-extrabold text-brand-500">{activeStep.timeEstimate}</span>
                    </div>

                    <div>
                      <span className="text-[9px] text-zinc-500 font-mono tracking-wider uppercase block">Complexity</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        {getComplexity(activeStep.name) === "Low" && (
                          <>
                            <span className="w-1.5 h-3.5 rounded bg-emerald-500" />
                            <span className="w-1.5 h-3.5 rounded bg-zinc-800" />
                            <span className="w-1.5 h-3.5 rounded bg-zinc-800" />
                            <span className="text-[9px] font-mono text-zinc-450 ml-1">LOW</span>
                          </>
                        )}
                        {getComplexity(activeStep.name) === "Medium" && (
                          <>
                            <span className="w-1.5 h-3.5 rounded bg-amber-500" />
                            <span className="w-1.5 h-3.5 rounded bg-amber-500" />
                            <span className="w-1.5 h-3.5 rounded bg-zinc-800" />
                            <span className="text-[9px] font-mono text-zinc-450 ml-1">MEDIUM</span>
                          </>
                        )}
                        {getComplexity(activeStep.name) === "High" && (
                          <>
                            <span className="w-1.5 h-3.5 rounded bg-brand-500 shadow-[0_0_6px_#ccff00]" />
                            <span className="w-1.5 h-3.5 rounded bg-brand-500 shadow-[0_0_6px_#ccff00]" />
                            <span className="w-1.5 h-3.5 rounded bg-brand-500 shadow-[0_0_6px_#ccff00]" />
                            <span className="text-[9px] font-mono text-zinc-450 ml-1">CRITICAL</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side circle check button */}
                <button
                  id={`spotlight-complete-${activeStep.id}`}
                  onClick={() => onToggleComplete(activeStep.id)}
                  className="w-12 h-12 rounded-full border border-brand-500/30 bg-zinc-950/60 hover:bg-brand-500 hover:text-zinc-950 text-brand-500 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-[0_4px_10px_rgba(204,255,0,0.1)] hover:shadow-[0_0_15px_#ccff00] group"
                  title="Mark spotlight step completed"
                >
                  <CheckCircle2 size={22} className="group-hover:scale-105 transition-transform" />
                </button>
              </div>

              {/* Bottom trigger to speak */}
              <div className="mt-4 flex justify-end">
                <button
                  id={`spotlight-speak-${activeStep.id}`}
                  onClick={() => onSelectAction(activeStep)}
                  className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-400 hover:text-brand-500 transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-full border border-white/5 shrink-0 cursor-pointer"
                >
                  <Volume2 size={10} className="animate-pulse" />
                  <span>Audio Assist</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Execution Queue Header & Cards List */}
      <div className="flex-1 flex flex-col min-h-0 space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-extrabold tracking-widest text-zinc-500 uppercase font-mono">
            Execution Queue ({totalCount} steps)
          </h3>
          {totalCount > 0 && (
            <span className="text-[9px] font-mono font-bold text-zinc-500 italic">
              Chronological order
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 scrollbar-thin pb-4">
          <AnimatePresence mode="popLayout">
            {totalCount === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center text-center py-12 px-4 border border-dashed border-white/5 rounded-3xl bg-zinc-900/10"
              >
                <div className="p-3 bg-zinc-900/30 rounded-2xl text-zinc-500 mb-2">
                  <HelpCircle size={22} />
                </div>
                <h4 className="text-zinc-400 font-bold text-xs font-display">Roadmap queue empty</h4>
                <p className="text-zinc-600 text-[10px] max-w-[200px] mt-1 leading-relaxed">
                  Start your turn by entering a goal in the AI Coach conversation tab.
                </p>
              </motion.div>
            ) : (
              plan.map((step) => {
                const isSpotlighted = activeStep?.id === step.id;
                const isHighlighted = highlightedStepId === step.id;

                return (
                  <motion.div
                    key={step.id}
                    id={`screen-step-${step.id}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      scale: isHighlighted ? 1.015 : 1
                    }}
                    exit={{ opacity: 0, y: -10 }}
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all duration-350 ${
                      step.completed
                        ? "bg-zinc-950/20 border-white/5 opacity-40"
                        : isHighlighted
                        ? "bg-brand-500/[0.04] border-brand-500/80 shadow-[0_0_15px_rgba(204,255,0,0.15)]"
                        : isSpotlighted
                        ? "bg-zinc-850/60 border-brand-500/20 shadow-[0_0_10px_rgba(204,255,0,0.05)]"
                        : "bg-zinc-900/25 border-white/5 hover:border-white/10"
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      id={`screen-step-toggle-${step.id}`}
                      onClick={() => onToggleComplete(step.id)}
                      className="mt-0.5 flex-shrink-0 cursor-pointer text-zinc-600 hover:text-brand-500 transition-colors"
                    >
                      {step.completed ? (
                        <CheckCircle2 size={18} className="text-brand-500 filter drop-shadow-[0_0_3px_#ccff00]" />
                      ) : (
                        <Circle
                          size={18}
                          className={isSpotlighted ? "text-brand-500" : "text-zinc-600"}
                        />
                      )}
                    </button>

                    {/* Step Title & info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {isSpotlighted && !step.completed && (
                          <span className="text-[7.5px] font-black tracking-widest bg-brand-500/10 text-brand-500 px-1.5 py-0.5 rounded uppercase font-mono">
                            Spotlight
                          </span>
                        )}
                        <span className="text-[9px] font-mono text-zinc-500 font-semibold flex items-center gap-1">
                          <Clock size={9} />
                          {step.timeSlot}
                        </span>
                      </div>
                      <h4 className={`text-xs font-semibold leading-relaxed tracking-tight ${
                        step.completed ? "line-through text-zinc-650 font-normal" : "text-zinc-200"
                      }`}>
                        {step.name}
                      </h4>
                    </div>

                    {/* Right Badge */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-[9px] font-mono font-bold text-zinc-400 bg-zinc-900/40 border border-white/5 px-2 py-0.5 rounded-lg">
                        {step.timeEstimate}
                      </span>
                      {!step.completed && !isSpotlighted && (
                        <button
                          id={`screen-step-spot-${step.id}`}
                          onClick={() => onSelectAction(step)}
                          className="p-1 rounded bg-zinc-800/40 text-zinc-500 hover:text-brand-500 hover:bg-zinc-800 transition-all cursor-pointer border border-white/5"
                          title="Isolate target action"
                        >
                          <Play size={8} fill="currentColor" />
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
    </div>
  );
}
