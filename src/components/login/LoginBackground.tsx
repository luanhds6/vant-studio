export function LoginBackground() {
  const RIBBON_A = "M-40 200 C 20 165 50 200 100 100 C 160 0 220 200 300 100 C 380 10 450 100 500 20 C 510 8 520 4 520 0";
  const RIBBON_C = "M-25 200 C 20 200 100 200 200 200 C 280 200 320 40 400 20 C 460 8 500 2 520 0";
  const LAYER2_PATHS = [
    "M-20 200 C 80 170 100 200 200 100 C 300 10 400 200 500 20 C 512 4 520 0 520 0",
    "M-10 200 C 100 150 200 30 300 200 C 400 110 500 20 520 0",
  ] as const;
  const parallelOffsets = [0, -5, -10, -16, -22] as const;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-slate-100 dark:bg-[#060d18]">
      {/* Mobile: só gradiente CSS (sem blur/SVG/SMIL — alivia GPU no telefone) */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-100 via-sky-50 to-amber-50 dark:from-[#060d18] dark:via-[#0a1628] dark:to-[#060d18] md:hidden"
        aria-hidden
      />

      {/* Desktop: blobs, grade, ondas e SVG animado */}
      <div className="absolute -left-[20%] top-[-10%] hidden h-[70%] w-[60%] rounded-full bg-blue-400/40 blur-[140px] dark:bg-blue-600/30 animate-pulse md:block" style={{ animationDuration: "10s" }} />
      <div className="absolute right-[-10%] bottom-[-10%] hidden h-[60%] w-[50%] rounded-full bg-amber-400/30 blur-[130px] dark:bg-amber-600/20 animate-pulse md:block" style={{ animationDuration: "14s", animationDelay: "3s" }} />
      <div className="absolute left-[30%] top-[40%] hidden h-[40%] w-[40%] rounded-full bg-sky-300/30 blur-[120px] dark:bg-sky-500/20 animate-pulse md:block" style={{ animationDuration: "12s", animationDelay: "1s" }} />

      <div className="absolute inset-0 hidden bg-[linear-gradient(to_right,#80808025_1px,transparent_1px),linear-gradient(to_bottom,#80808025_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_80%,transparent_100%)] md:block" />

      {/* --- WAVES BACKGROUND --- */}
      <div className="absolute inset-0 hidden opacity-40 will-change-transform animate-vant-login-wave-aurora dark:opacity-30 md:block">
        <div className="absolute bottom-0 left-0 h-full w-full animate-vant-login-wave-drift-1">
          <svg className="h-full w-full object-cover" viewBox="0 0 520 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="bgWaveA" x1="0%" y1="50%" x2="100%" y2="50%">
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
              <g key={`bg-a-${oy}`} transform={`translate(0 ${oy})`}>
                <path fill="none" stroke="url(#bgWaveA)" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.1 - i * 0.08} opacity={0.5 - i * 0.06} d={RIBBON_A} />
              </g>
            ))}
          </svg>
        </div>

        <div className="absolute bottom-0 left-0 h-full w-full animate-vant-login-wave-drift-2" style={{ animationDelay: "-3s" }}>
          <svg className="h-full w-full opacity-80" viewBox="0 0 520 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="bgWaveB" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0f2952" stopOpacity="0.75" />
                <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.6">
                  <animate attributeName="stop-color" dur="4s" repeatCount="indefinite" values="#22d3ee;#3b82f6;#67e8f9;#22d3ee" />
                </stop>
                <stop offset="100%" stopColor="#0d2347" stopOpacity="0.35" />
              </linearGradient>
            </defs>
            {LAYER2_PATHS.map((d, j) => (
              <g key={`bg-${d}`} transform={j === 1 ? "translate(0 -3)" : ""} opacity={0.45 + j * 0.2}>
                <path fill="none" stroke="url(#bgWaveB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth={j === 0 ? 0.85 : 0.6} d={d} />
                <path fill="none" stroke="#7dd3fc" strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.35} opacity={0.28} d={d} />
              </g>
            ))}
          </svg>
        </div>

        <div className="absolute bottom-0 left-0 h-full w-full animate-vant-login-wave-drift-3" style={{ animationDelay: "-1.2s" }}>
          <svg className="h-full w-full" viewBox="0 0 520 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="bgWaveC" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#172554" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#a5d7ff" stopOpacity="0.9">
                  <animate attributeName="stop-opacity" dur="3s" repeatCount="indefinite" values="0.5;0.95;0.6;0.5" />
                </stop>
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.45" />
              </linearGradient>
            </defs>
            <g>
              <path fill="none" stroke="url(#bgWaveC)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.65" d={RIBBON_C} />
              <path fill="none" stroke="#bae6fd" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.4" opacity={0.45} d={RIBBON_C} />
            </g>
          </svg>
        </div>
      </div>
      {/* --- END WAVES BACKGROUND --- */}

      <svg className="absolute inset-0 hidden h-full w-full opacity-80 dark:opacity-60 md:block" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="pageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" className="text-blue-500" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" className="text-cyan-400" />
          </linearGradient>
          <linearGradient id="pageGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" className="text-amber-500" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" className="text-orange-400" />
          </linearGradient>
        </defs>

        {/* Page 1 - Large Left/Top */}
        <g stroke="currentColor" className="text-slate-400 dark:text-slate-500" strokeWidth="2" fill="url(#pageGrad)">
          <animateTransform attributeName="transform" type="translate" values="150,150; 120,180; 150,150" dur="12s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="rotate" values="-10 110 150; 0 110 150; -10 110 150" dur="24s" additive="sum" repeatCount="indefinite" />
          <rect x="0" y="0" width="220" height="300" rx="16" />
          <line x1="30" y1="40" x2="190" y2="40" strokeWidth="6" strokeLinecap="round" opacity="0.6" />
          <line x1="30" y1="70" x2="140" y2="70" strokeWidth="4" strokeLinecap="round" opacity="0.4" />
          <rect x="30" y="110" width="70" height="70" rx="8" opacity="0.3" />
          <rect x="120" y="110" width="70" height="70" rx="8" opacity="0.3" />
          <line x1="30" y1="210" x2="180" y2="210" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
          <line x1="30" y1="230" x2="150" y2="230" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
        </g>

        {/* Page 2 - Floating Right/Top */}
        <g stroke="currentColor" className="text-slate-400 dark:text-slate-500" strokeWidth="2" fill="url(#pageGradDark)">
          <animateTransform attributeName="transform" type="translate" values="1400,200; 1450,150; 1400,200" dur="16s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="rotate" values="15 130 170; 5 130 170; 15 130 170" dur="28s" additive="sum" repeatCount="indefinite" />
          <rect x="0" y="0" width="260" height="340" rx="16" />
          <rect x="30" y="30" width="200" height="140" rx="10" opacity="0.3" />
          <line x1="30" y1="200" x2="230" y2="200" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
          <line x1="30" y1="230" x2="180" y2="230" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
          <line x1="30" y1="250" x2="200" y2="250" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
          <circle cx="200" cy="290" r="15" opacity="0.3" />
        </g>

        {/* Page 3 - Small Bottom Right */}
        <g stroke="currentColor" className="text-slate-400 dark:text-slate-500" strokeWidth="2" fill="url(#pageGrad)">
          <animateTransform attributeName="transform" type="translate" values="1600,750; 1580,700; 1600,750" dur="14s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="rotate" values="-25 80 110; -15 80 110; -25 80 110" dur="22s" additive="sum" repeatCount="indefinite" />
          <rect x="0" y="0" width="160" height="220" rx="12" />
          <line x1="20" y1="30" x2="140" y2="30" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
          <rect x="20" y="55" width="120" height="80" rx="8" opacity="0.25" />
          <line x1="20" y1="160" x2="110" y2="160" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
          <line x1="20" y1="180" x2="130" y2="180" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
        </g>

        {/* Page 4 - Bottom Left */}
        <g stroke="currentColor" className="text-slate-400 dark:text-slate-500" strokeWidth="2" fill="url(#pageGradDark)">
          <animateTransform attributeName="transform" type="translate" values="300,750; 250,800; 300,750" dur="19s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="rotate" values="10 100 150; 20 100 150; 10 100 150" dur="26s" additive="sum" repeatCount="indefinite" />
          <rect x="0" y="0" width="200" height="280" rx="14" />
          <circle cx="100" cy="80" r="40" opacity="0.3" />
          <line x1="30" y1="150" x2="170" y2="150" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
          <line x1="30" y1="180" x2="120" y2="180" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
          <line x1="30" y1="210" x2="150" y2="210" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
        </g>

      </svg>
    </div>
  );
}
