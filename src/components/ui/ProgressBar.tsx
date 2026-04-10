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
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm text-[#6B7280]">{label}</span>}
          {showPercent && (
            <span className="text-sm font-semibold text-[#1F2937]">{percent}%</span>
          )}
        </div>
      )}
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
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
