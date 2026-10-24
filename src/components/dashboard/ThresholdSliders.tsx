import React, { useState, useEffect } from 'react';
import { Sliders, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card.js';
import { Button } from '../ui/Button.js';

interface ThresholdSlidersProps {
  sessionId?: string;
  initialLate: number;
  initialCut: number;
  onApply: (late: number, cut: number) => Promise<void>;
  disabled?: boolean;
}

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

  const handleApply = async () => {
    if (cutThreshold <= lateThreshold) {
      setFeedback({
        type: 'error',
        message: 'Invalid configuration: Cut-off threshold must strictly exceed late grace period.',
      });
      return;
    }

    try {
      setIsApplying(true);
      setFeedback(null);
      await onApply(lateThreshold, cutThreshold);
      setFeedback({
        type: 'success',
        message: 'Attendance records re-evaluated across section manifest.',
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to recalibrate thresholds',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const isDirty = lateThreshold !== initialLate || cutThreshold !== initialCut;

  return (
    <Card
      title="Punctuality Thresholds"
      subtitle="Dynamic threshold reclassification based on session arrival offsets"
      action={
        <div className="flex items-center gap-1.5 text-xs text-hud-secondary">
          <Sliders className="w-3.5 h-3.5 text-emerald-400" />
          <span>Active Policy</span>
        </div>
      }
    >
      <div className="space-y-5 text-xs">
        {/* Interactive Time-Bracket Visualizer */}
        <div className="space-y-2">
          <div className="text-xs text-hud-secondary uppercase font-medium tracking-wider flex justify-between">
            <span>Arrival Timeline</span>
            <span className="text-hud-muted">0m — 60m</span>
          </div>
          <div className="h-3 w-full bg-hud-elevated/70 flex overflow-hidden rounded-full">
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
            <span className="text-emerald-400">0m (On-Time)</span>
            <span className="text-amber-400">{lateThreshold}m (Late)</span>
            <span className="text-rose-400">{cutThreshold}m (Cut)</span>
            <span className="text-hud-muted">60m+</span>
          </div>
        </div>

        {/* Clean Stacked Sliders */}
        <div className="space-y-4">
          {/* Late Slider */}
          <div className="bg-hud-elevated/40 p-4 border border-hud-border/70 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-amber-400 font-semibold text-xs uppercase tracking-wider">
                Late Grace Window
              </span>
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 font-bold font-mono num-tabular rounded-full text-xs">
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
              onChange={(e) => setLateThreshold(parseInt(e.target.value, 10))}
              className="w-full cursor-pointer disabled:opacity-30"
            />
            <div className="flex justify-between text-xs text-hud-muted">
              <span>01 min</span>
              <span className="text-slate-400">0 to {lateThreshold}m = Present</span>
              <span>45 mins</span>
            </div>
          </div>

          {/* Cut Slider */}
          <div className="bg-hud-elevated/40 p-4 border border-hud-border/70 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-rose-400 font-semibold text-xs uppercase tracking-wider">
                Cut-off Threshold
              </span>
              <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 font-bold font-mono num-tabular rounded-full text-xs">
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
              onChange={(e) => setCutThreshold(parseInt(e.target.value, 10))}
              className="w-full cursor-pointer disabled:opacity-30"
            />
            <div className="flex justify-between text-xs text-hud-muted">
              <span>05 mins</span>
              <span className="text-slate-400">{lateThreshold}m to {cutThreshold}m = Late</span>
              <span>90 mins</span>
            </div>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-hud-border/60">
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
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ThresholdSliders;
