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
      title="Punctuality Calibration Engine"
      subtitle="Dynamic threshold reclassification based on session arrival offsets"
      action={
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-hud-secondary">
          <Sliders className="w-3.5 h-3.5 text-hud-lime" />
          <span>CHRONO_EVAL</span>
        </div>
      }
    >
      <div className="space-y-4 font-mono text-xs">
        {/* Interactive Time-Bracket Visualizer */}
        <div className="space-y-1.5">
          <div className="text-[10px] text-hud-secondary uppercase tracking-wider flex justify-between">
            <span>Punctuality Bracket Mapping</span>
            <span className="text-hud-muted">0m — 60m Timeline</span>
          </div>
          <div className="h-2.5 w-full bg-hud-elevated border border-hud-border flex overflow-hidden rounded-sm">
            <div
              style={{ width: `${Math.min(100, (lateThreshold / 60) * 100)}%` }}
              className="bg-hud-lime h-full border-r border-hud-bg"
              title={`Present: 0 to ${lateThreshold} mins`}
            />
            <div
              style={{
                width: `${Math.min(100, ((cutThreshold - lateThreshold) / 60) * 100)}%`,
              }}
              className="bg-hud-amber h-full border-r border-hud-bg"
              title={`Late: ${lateThreshold} to ${cutThreshold} mins`}
            />
            <div
              className="bg-hud-rose flex-1 h-full"
              title={`Cut: > ${cutThreshold} mins`}
            />
          </div>
          <div className="flex justify-between text-[9px] text-hud-secondary">
            <span className="text-hud-lime">0m (Present)</span>
            <span className="text-hud-amber">{lateThreshold}m (Late)</span>
            <span className="text-hud-rose">{cutThreshold}m (Cut)</span>
            <span className="text-hud-muted">60m+</span>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Late Slider */}
          <div className="bg-hud-bg p-3 border border-hud-border rounded-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-hud-amber font-semibold text-[11px] uppercase tracking-wider">
                Late Grace Window
              </span>
              <span className="bg-hud-amber-bg text-hud-amber border border-hud-amber-border px-2 py-0.5 font-bold num-tabular rounded-sm">
                {lateThreshold}m ({(lateThreshold * 60).toLocaleString()}s)
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
            <div className="flex justify-between text-[9px] text-hud-muted mt-1.5">
              <span>01m</span>
              <span>0 to {lateThreshold}m = Present</span>
              <span>45m</span>
            </div>
          </div>

          {/* Cut Slider */}
          <div className="bg-hud-bg p-3 border border-hud-border rounded-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-hud-rose font-semibold text-[11px] uppercase tracking-wider">
                Cut-off Threshold
              </span>
              <span className="bg-hud-rose-bg text-hud-rose border border-hud-rose-border px-2 py-0.5 font-bold num-tabular rounded-sm">
                {cutThreshold}m ({(cutThreshold * 60).toLocaleString()}s)
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
            <div className="flex justify-between text-[9px] text-hud-muted mt-1.5">
              <span>05m</span>
              <span>{lateThreshold}m to {cutThreshold}m = Late</span>
              <span>90m</span>
            </div>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-hud-subtle">
          <div className="text-[10px] text-hud-secondary flex items-center gap-2">
            <span>&gt; {cutThreshold}m = Cut</span>
            <span className="text-hud-muted">•</span>
            <span>Manual overrides preserved</span>
          </div>

          <Button
            size="sm"
            variant={isDirty ? 'primary' : 'secondary'}
            disabled={disabled || !isDirty}
            onClick={handleApply}
            isLoading={isApplying}
            leftIcon={<RefreshCw className={`w-3 h-3 ${isApplying ? 'animate-spin' : ''}`} />}
          >
            Apply Recalculation
          </Button>
        </div>

        {/* Feedback message */}
        {feedback && (
          <div
            className={`p-2.5 text-xs flex items-center gap-2 border rounded-sm ${
              feedback.type === 'success'
                ? 'bg-hud-lime-bg text-hud-lime border-hud-lime-border'
                : 'bg-hud-rose-bg text-hud-rose border-hud-rose-border'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-hud-lime shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-hud-rose shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ThresholdSliders;
