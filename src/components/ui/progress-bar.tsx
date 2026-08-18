import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value?: number;
  indeterminate?: boolean;
  className?: string;
  label?: string;
}

export function ProgressBar({ value, indeterminate, className, label }: ProgressBarProps) {
  return (
    <div className={cn("w-full space-y-2", className)}>
      <style>{`
        @keyframes indeterminate-progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
      {label && (
        <div className="flex justify-between text-xs font-medium text-muted-foreground">
          <span>{label}</span>
          {!indeterminate && value !== undefined && <span>{Math.round(value)}%</span>}
        </div>
      )}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/60">
        {indeterminate ? (
          <div
            className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-primary"
            style={{ animation: "indeterminate-progress 1.5s infinite ease-in-out" }}
          />
        ) : (
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, value || 0))}%` }}
          />
        )}
      </div>
    </div>
  );
}
