import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const RIBBON_A = "M-40 200 C 20 165 50 200 100 100 C 160 0 220 200 300 100 C 380 10 450 100 500 20 C 510 8 520 4 520 0";
const RIBBON_C = "M-25 200 C 20 200 100 200 200 200 C 280 200 320 40 400 20 C 460 8 500 2 520 0";
const LAYER2_PATHS = [
  "M-20 200 C 80 170 100 200 200 100 C 300 10 400 200 500 20 C 512 4 520 0 520 0",
  "M-10 200 C 100 150 200 30 300 200 C 400 110 500 20 520 0",
] as const;
const parallelOffsets = [0, -5, -10, -16, -22] as const;

function DarkWaves() {
  return (
    <div className="hidden dark:block absolute inset-0 will-change-transform animate-vant-login-wave-aurora">
      <div className="absolute bottom-0 left-0 h-full w-full animate-vant-login-wave-drift-1">
        <svg className="h-full w-full" viewBox="-60 -10 580 220" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sysWaveADark" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#0a1628">
                <animate attributeName="stop-color" dur="6s" repeatCount="indefinite" values="#0a1628;#0f2540;#0a1628;#0a1628" />
              </stop>
              <stop offset="50%" stopColor="#2bb0ff" stopOpacity="0.9">
                <animate attributeName="stop-color" dur="5s" repeatCount="indefinite" values="#2da3ff;#4ae8ff;#60a5fa;#2da3ff" />
              </stop>
              <stop offset="100%" stopColor="#0d2347" stopOpacity="0.45" />
            </linearGradient>
          </defs>
          {parallelOffsets.map((oy, i) => (
            <g key={`sys-ad-${oy}`} transform={`translate(0 ${oy})`}>
              <path fill="none" stroke="url(#sysWaveADark)" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.1 - i * 0.08} opacity={0.5 - i * 0.06} d={RIBBON_A} />
            </g>
          ))}
        </svg>
      </div>

      <div className="absolute bottom-0 left-0 h-full w-full animate-vant-login-wave-drift-2" style={{ animationDelay: "-3s" }}>
        <svg className="h-full w-full opacity-80" viewBox="-60 -10 580 220" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sysWaveBDark" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f2952" stopOpacity="0.75" />
              <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.6">
                <animate attributeName="stop-color" dur="4s" repeatCount="indefinite" values="#22d3ee;#3b82f6;#67e8f9;#22d3ee" />
              </stop>
              <stop offset="100%" stopColor="#0d2347" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          {LAYER2_PATHS.map((d, j) => (
            <g key={`sys-bd-${d}`} transform={j === 1 ? "translate(0 -3)" : ""} opacity={0.45 + j * 0.2}>
              <path fill="none" stroke="url(#sysWaveBDark)" strokeLinecap="round" strokeLinejoin="round" strokeWidth={j === 0 ? 0.85 : 0.6} d={d} />
              <path fill="none" stroke="#7dd3fc" strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.35} opacity={0.28} d={d} />
            </g>
          ))}
        </svg>
      </div>

      <div className="absolute bottom-0 left-0 h-full w-full animate-vant-login-wave-drift-3" style={{ animationDelay: "-1.2s" }}>
        <svg className="h-full w-full" viewBox="-60 -10 580 220" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sysWaveCDark" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#172554" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#a5d7ff" stopOpacity="0.9">
                <animate attributeName="stop-opacity" dur="3s" repeatCount="indefinite" values="0.5;0.95;0.6;0.5" />
              </stop>
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.45" />
            </linearGradient>
          </defs>
          <g>
            <path fill="none" stroke="url(#sysWaveCDark)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.65" d={RIBBON_C} />
            <path fill="none" stroke="#bae6fd" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.4" opacity={0.45} d={RIBBON_C} />
          </g>
        </svg>
      </div>
    </div>
  );
}

function LightWaves() {
  return (
    <div className="block dark:hidden absolute inset-0 will-change-transform animate-vant-login-wave-aurora">
      <div className="absolute bottom-0 left-0 h-full w-full animate-vant-login-wave-drift-1">
        <svg className="h-full w-full" viewBox="-60 -10 580 220" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sysWaveALight" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.5">
                <animate attributeName="stop-color" dur="6s" repeatCount="indefinite" values="#cbd5e1;#94a3b8;#cbd5e1;#cbd5e1" />
              </stop>
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8">
                <animate attributeName="stop-color" dur="5s" repeatCount="indefinite" values="#3b82f6;#60a5fa;#818cf8;#3b82f6" />
              </stop>
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          {parallelOffsets.map((oy, i) => (
            <g key={`sys-al-${oy}`} transform={`translate(0 ${oy})`}>
              <path fill="none" stroke="url(#sysWaveALight)" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2 - i * 0.08} opacity={0.6 - i * 0.06} d={RIBBON_A} />
            </g>
          ))}
        </svg>
      </div>

      <div className="absolute bottom-0 left-0 h-full w-full animate-vant-login-wave-drift-2" style={{ animationDelay: "-3s" }}>
        <svg className="h-full w-full opacity-90" viewBox="-60 -10 580 220" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sysWaveBLight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.7">
                <animate attributeName="stop-color" dur="4s" repeatCount="indefinite" values="#8b5cf6;#a78bfa;#c084fc;#8b5cf6" />
              </stop>
              <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          {LAYER2_PATHS.map((d, j) => (
            <g key={`sys-bl-${d}`} transform={j === 1 ? "translate(0 -3)" : ""} opacity={0.5 + j * 0.2}>
              <path fill="none" stroke="url(#sysWaveBLight)" strokeLinecap="round" strokeLinejoin="round" strokeWidth={j === 0 ? 1.0 : 0.7} d={d} />
              <path fill="none" stroke="#a78bfa" strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.4} opacity={0.4} d={d} />
            </g>
          ))}
        </svg>
      </div>

      <div className="absolute bottom-0 left-0 h-full w-full animate-vant-login-wave-drift-3" style={{ animationDelay: "-1.2s" }}>
        <svg className="h-full w-full" viewBox="-60 -10 580 220" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sysWaveCLight" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8">
                <animate attributeName="stop-opacity" dur="3s" repeatCount="indefinite" values="0.6;0.9;0.7;0.6" />
                <animate attributeName="stop-color" dur="4s" repeatCount="indefinite" values="#f59e0b;#fbbf24;#f59e0b" />
              </stop>
              <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <g>
            <path fill="none" stroke="url(#sysWaveCLight)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.8" d={RIBBON_C} />
            <path fill="none" stroke="#fbbf24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.5" opacity={0.6} d={RIBBON_C} />
          </g>
        </svg>
      </div>
    </div>
  );
}

export function SystemWavesBackground() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-0 right-0 z-0 hidden h-64 w-[min(100%,45rem)] overflow-hidden opacity-70 dark:opacity-40 [mask-image:linear-gradient(to_right,transparent_0%,black_15%,black_100%)] md:block">
      {mounted && resolvedTheme === "dark" ? <DarkWaves /> : null}
      {mounted && resolvedTheme !== "dark" ? <LightWaves /> : null}
    </div>
  );
}
