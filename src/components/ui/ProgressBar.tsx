interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  colorClass?: string;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercent = true,
  colorClass = "bg-[#4CAF50]",
  className = "",
}: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, Math.round((value / Math.max(max, 1)) * 100)));

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercent) && (
        <div className="mb-2 flex items-center justify-between gap-3">
          {label && <span className="text-sm font-medium text-[var(--tca-text-soft)]">{label}</span>}
          {showPercent && (
            <span className="rounded-full border border-[var(--tca-border)] bg-white px-2.5 py-1 text-sm font-semibold text-[var(--foreground)] shadow-[0_8px_18px_-18px_rgba(15,23,42,0.7)]">{percent}%</span>
          )}
        </div>
      )}
      <div className="h-3.5 w-full overflow-hidden rounded-full border border-[var(--tca-border)] bg-[linear-gradient(180deg,#eef2f7_0%,#e7edf4_100%)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.65)]">
        <div
          className={`h-full rounded-full transition-all duration-500 shadow-[0_6px_18px_-10px_rgba(91,110,225,0.85)] ${colorClass}`}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
