import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
  withWordmark?: boolean;
}

export function Logo({ size = 28, className, withWordmark = false }: LogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="DevPulse"
      >
        <rect x="2" y="2" width="28" height="28" rx="8" fill="#3b82f6" />
        <rect
          x="2.5"
          y="2.5"
          width="27"
          height="27"
          rx="7.5"
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="0.8"
        />
        <path
          d="M6 16 L11 16 L13 11 L16 21 L19 13 L21 16 L26 16"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {withWordmark && (
        <span className="text-base font-semibold tracking-tight text-fg">DevPulse</span>
      )}
    </div>
  );
}
