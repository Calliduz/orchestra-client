import React, { useState, useEffect } from 'react';
import { Sliders, RefreshCw, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';
import { sounds } from '../../utils/audio.js';

interface ThresholdSlidersProps {
  sessionId?: string;
  initialLate: number;
  initialCut: number;
  onApply: (late: number, cut: number) => Promise<void>;
  disabled?: boolean;
}

const POLICY_PRESETS = [
  { id: 'strict', label: 'Strict Lab', late: 10, cut: 30, desc: '10m / 30m' },
  { id: 'standard', label: 'Standard', late: 15, cut: 45, desc: '15m / 45m' },
  { id: 'grace', label: 'Rain / Grace', late: 25, cut: 60, desc: '25m / 60m' },
];

export const ThresholdSliders: React.FC<ThresholdSlidersProps> = ({
  sessionId,
  initialLate,
  initialCut,
  onApply,
  disabled = false,
}) => {
  const [lateThreshold, setLateThreshold] = useState(initialLate);
  const [cutThreshold, setCutThreshold] = useState(initialCut);
  const [isApplying, setIsApplying] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    setLateThreshold(initialLate);
    setCutThreshold(initialCut);
  }, [initialLate, initialCut]);

  const applyThresholdValues = async (targetLate: number, targetCut: number) => {
    if (targetCut <= targetLate) {
      sounds.playErrorBuzz();
      setFeedback({
        type: 'error',
        message: 'Invalid configuration: Cut-off threshold must strictly exceed late grace period.',
      });
      return;
    }

    try {
      setIsApplying(true);
      setFeedback(null);
      await onApply(targetLate, targetCut);
      sounds.playSuccessChime();
      setFeedback({
        type: 'success',
        message: `Attendance re-evaluated: Late @ ${targetLate}m, Cut @ ${targetCut}m.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      sounds.playErrorBuzz();
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to recalibrate thresholds',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleApply = async () => {
    await applyThresholdValues(lateThreshold, cutThreshold);
  };

  const handleQuickPresetApply = async (late: number, cut: number) => {
    setLateThreshold(late);
    setCutThreshold(cut);
    sounds.playKeyChirp();
    await applyThresholdValues(late, cut);
  };

  const isDirty = lateThreshold !== initialLate || cutThreshold !== initialCut;

  return (
    <Card
      title="Punctuality Thresholds"
      subtitle="Dynamic threshold reclassification based on session arrival offsets"
      action={
        <div className="flex items-center gap-1.5 text-xs text-hud-secondary font-medium">
          <Sliders className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
          <span>Active Policy</span>
        </div>
      }
    >
      <div className="space-y-6 text-xs">
        {/* Interactive Time-Bracket Visualizer */}
        <div className="space-y-2">
          <div className="text-[11px] text-hud-secondary uppercase font-bold tracking-wider flex justify-between font-sans">
            <span>Arrival Timeline</span>
            <span className="text-hud-muted font-mono">0m — 60m</span>
          </div>
          <div className="h-3.5 w-full bg-slate-200 dark:bg-slate-800 flex overflow-hidden rounded-full shadow-inner">
            <div
              style={{ width: `${Math.min(100, (lateThreshold / 60) * 100)}%` }}
              className="bg-emerald-500 h-full transition-all"
              title={`Present: 0 to ${lateThreshold} mins`}
            />
            <div
              style={{
                width: `${Math.min(100, ((cutThreshold - lateThreshold) / 60) * 100)}%`,
              }}
              className="bg-amber-500 h-full transition-all"
              title={`Late: ${lateThreshold} to ${cutThreshold} mins`}
            />
            <div
              className="bg-rose-500 flex-1 h-full transition-all"
              title={`Cut: > ${cutThreshold} mins`}
            />
          </div>
          <div className="flex justify-between text-xs text-hud-secondary font-mono">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">0m (On-Time)</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">{lateThreshold}m (Late)</span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">{cutThreshold}m (Cut)</span>
            <span className="text-hud-muted">60m+</span>
          </div>
        </div>

        {/* 1-Click Policy Presets with Instant Apply */}
        <div className="space-y-2">
          <div className="text-[11px] font-sans font-bold uppercase tracking-wider text-hud-secondary">
            Quick Policy Presets
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {POLICY_PRESETS.map((preset) => {
              const isSelected = lateThreshold === preset.late && cutThreshold === preset.cut;
              return (
                <div
                  key={preset.id}
                  className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-300 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-hud-secondary hover:text-hud-text'
                  }`}
                >
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setLateThreshold(preset.late);
                      setCutThreshold(preset.cut);
                      sounds.playKeyChirp();
                    }}
                    className="text-left w-full disabled:opacity-40"
                  >
                    <div className="font-bold text-xs">{preset.label}</div>
                    <div className="text-[10px] font-mono opacity-80">{preset.desc}</div>
                  </button>

                  <button
                    type="button"
                    disabled={disabled || isApplying}
                    onClick={() => handleQuickPresetApply(preset.late, preset.cut)}
                    title={`Instant apply ${preset.label}`}
                    className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-sky-500/15 hover:bg-sky-600 text-sky-600 dark:text-sky-400 hover:text-white transition-all text-[10px] font-bold border border-sky-500/25 active:scale-95 disabled:opacity-40"
                  >
                    <Zap className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                    <span>Apply</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Clean Stacked Sliders with Tactile Containers */}
        <div className="space-y-4">
          {/* Late Slider */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-tactile space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                Late Grace Window
              </span>
              <span className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-3 py-0.5 font-bold font-mono num-tabular rounded-full text-xs shadow-sm">
                {lateThreshold} mins
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="45"
              step="1"
              value={lateThreshold}
              disabled={disabled}
              onChange={(e) => {
                setLateThreshold(parseInt(e.target.value, 10));
              }}
              className="w-full cursor-pointer disabled:opacity-30"
            />
            <div className="flex justify-between text-xs text-hud-muted font-mono">
              <span>01 min</span>
              <span className="text-slate-500 dark:text-slate-400 font-body">0 to {lateThreshold}m = Present</span>
              <span>45 mins</span>
            </div>
          </div>

          {/* Cut Slider */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-tactile space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider">
                Cut-off Threshold
              </span>
              <span className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 px-3 py-0.5 font-bold font-mono num-tabular rounded-full text-xs shadow-sm">
                {cutThreshold} mins
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="90"
              step="1"
              value={cutThreshold}
              disabled={disabled}
              onChange={(e) => {
                setCutThreshold(parseInt(e.target.value, 10));
              }}
              className="w-full cursor-pointer disabled:opacity-30"
            />
            <div className="flex justify-between text-xs text-hud-muted font-mono">
              <span>05 mins</span>
              <span className="text-slate-500 dark:text-slate-400 font-body">{lateThreshold}m to {cutThreshold}m = Late</span>
              <span>90 mins</span>
            </div>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700/60">
          <div className="text-xs text-hud-secondary">
            <span>&gt; {cutThreshold}m = Cut</span>
            <span className="mx-1.5 text-hud-muted">•</span>
            <span>Overrides preserved</span>
          </div>

          <Button
            size="sm"
            variant={isDirty ? 'primary' : 'secondary'}
            disabled={disabled || !isDirty}
            onClick={handleApply}
            isLoading={isApplying}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isApplying ? 'animate-spin' : ''}`} />}
          >
            Apply Recalculation
          </Button>
        </div>

        {/* Feedback message */}
        {feedback && (
          <div
            className={`p-3 text-xs flex items-center gap-2 border rounded-xl ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ThresholdSliders;
