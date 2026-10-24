import React, { useState, useEffect } from 'react';
import { Sliders, RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
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
        message: 'Invalid configuration: Cut-off threshold must exceed late threshold.',
      });
      return;
    }

    try {
      setIsApplying(true);
      setFeedback(null);
      await onApply(lateThreshold, cutThreshold);
      setFeedback({
        type: 'success',
        message: 'Ingress records dynamically re-evaluated across section manifest.',
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update punctuality thresholds',
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
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#7E8B9B]">
          <Sliders className="w-3.5 h-3.5 text-[#CCFF00]" />
          <span>ALGO: CHRONO_EVAL</span>
        </div>
      }
    >
      <div className="space-y-4 font-mono text-xs">
        {/* Interactive Time-Bracket Visualizer */}
        <div className="space-y-1.5">
          <div className="text-[10px] text-[#7E8B9B] uppercase tracking-wider flex justify-between">
            <span>Punctuality Bracket Mapping</span>
            <span>0m — 60m Timeline</span>
          </div>
          <div className="h-3 w-full bg-[#121720] border border-[#1E2632] flex overflow-hidden">
            <div
              style={{ width: `${Math.min(100, (lateThreshold / 60) * 100)}%` }}
              className="bg-[#CCFF00]/80 h-full border-r border-[#080A0D]"
              title={`Present: 0 to ${lateThreshold} mins`}
            />
            <div
              style={{
                width: `${Math.min(100, ((cutThreshold - lateThreshold) / 60) * 100)}%`,
              }}
              className="bg-[#F59E0B]/80 h-full border-r border-[#080A0D]"
              title={`Late: ${lateThreshold} to ${cutThreshold} mins`}
            />
            <div
              className="bg-[#FB923C]/80 flex-1 h-full"
              title={`Cut: > ${cutThreshold} mins`}
            />
          </div>
          <div className="flex justify-between text-[9px] text-[#6A7888]">
            <span className="text-[#CCFF00]">0m (Present)</span>
            <span className="text-[#F59E0B]">{lateThreshold}m (Late)</span>
            <span className="text-[#FB923C]">{cutThreshold}m (Cut)</span>
            <span>60m+</span>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Late Slider */}
          <div className="bg-[#0A0D12] p-3 border border-[#1E2632]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#F59E0B] font-semibold text-[11px] uppercase tracking-wider">
                Late Grace Period
              </span>
              <span className="bg-[#201503] text-[#F59E0B] border border-[#4D3308] px-2 py-0.5 font-bold num-tabular">
                {lateThreshold} MINS ({(lateThreshold * 60).toLocaleString()}S)
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
            <div className="flex justify-between text-[9px] text-[#6A7888] mt-1.5">
              <span>01m</span>
              <span>0 to {lateThreshold}m = Present</span>
              <span>45m</span>
            </div>
          </div>

          {/* Cut Slider */}
          <div className="bg-[#0A0D12] p-3 border border-[#1E2632]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#FB923C] font-semibold text-[11px] uppercase tracking-wider">
                Cut-off Threshold
              </span>
              <span className="bg-[#241103] text-[#FB923C] border border-[#57270D] px-2 py-0.5 font-bold num-tabular">
                {cutThreshold} MINS ({(cutThreshold * 60).toLocaleString()}S)
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
            <div className="flex justify-between text-[9px] text-[#6A7888] mt-1.5">
              <span>05m</span>
              <span>{lateThreshold}m to {cutThreshold}m = Late</span>
              <span>90m</span>
            </div>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-[#18202B]">
          <div className="text-[10px] text-[#7E8B9B] flex items-center gap-2">
            <span>&gt; {cutThreshold}m = Cut</span>
            <span className="text-[#3E4A5B]">•</span>
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
            className={`p-2.5 text-xs flex items-center gap-2 border ${
              feedback.type === 'success'
                ? 'bg-[#12200A] text-[#CCFF00] border-[#29420D]'
                : 'bg-[#220B0B] text-[#F87171] border-[#4A1515]'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#CCFF00] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ThresholdSliders;
