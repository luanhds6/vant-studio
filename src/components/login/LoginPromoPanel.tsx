import { BRAND_LOGO_SRC } from "@/brand";
import { FileText, Layers, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const highlights = [
  {
    icon: FileText,
    title: "PDF em um clique",
    text: "Catálogo padronizado, sem retrabalho manual.",
    ring: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
  },
  {
    icon: Layers,
    title: "Produtos organizados",
    text: "Fotos, medidas, cores e detalhes técnicos juntos.",
    ring: "bg-violet-500/10 text-violet-300 ring-violet-500/20",
  },
  {
    icon: ShieldCheck,
    title: "Prévia antes de enviar",
    text: "Confira o layout e só então exporte.",
    ring: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  },
] as const;

/** Fitas finas em curva, canto esquerdo inferior. */
const RIBBON_A =
  "M-40 200 C 20 165 50 200 100 100 C 160 0 220 200 300 100 C 380 10 450 100 500 20 C 510 8 520 4 520 0";
const RIBBON_C =
  "M-25 200 C 20 200 100 200 200 200 C 280 200 320 40 400 20 C 460 8 500 2 520 0";
const LAYER2_PATHS = [
  "M-20 200 C 80 170 100 200 200 100 C 300 10 400 200 500 20 C 512 4 520 0 520 0",
  "M-10 200 C 100 150 200 30 300 200 C 400 110 500 20 520 0",
] as const;

function LoginWaves() {
  const parallelOffsets = [0, -5, -10, -16, -22] as const;
  const waveSparkles: { cx: number; cy: number; r: number; o: number }[] = [
    { cx: 40, cy: 188, r: 0.8, o: 0.35 },
    { cx: 95, cy: 142, r: 0.6, o: 0.2 },
    { cx: 180, cy: 128, r: 1, o: 0.3 },
    { cx: 260, cy: 175, r: 0.5, o: 0.15 },
    { cx: 320, cy: 90, r: 0.7, o: 0.4 },
    { cx: 380, cy: 150, r: 0.55, o: 0.18 },
    { cx: 440, cy: 72, r: 0.9, o: 0.32 },
    { cx: 500, cy: 115, r: 0.5, o: 0.22 },
    { cx: 70, cy: 165, r: 0.4, o: 0.12 },
    { cx: 150, cy: 180, r: 0.65, o: 0.2 },
  ];

  return (
    <div
      className="pointer-events-none absolute bottom-0 left-0 z-[1] h-40 w-[min(120%,32rem)] overflow-hidden md:h-44 [mask-image:linear-gradient(90deg,black_0%,black_85%,transparent_100%)]"
      aria-hidden
    >
      <div className="absolute -bottom-1 -left-20 w-[42rem] max-w-[210%] origin-bottom-left will-change-transform animate-vant-login-wave-aurora md:-left-10">
        <div className="absolute bottom-0 left-0 w-full animate-vant-login-wave-drift-1">
          <svg className="h-44 w-full" viewBox="0 0 520 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="loginLgradA" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#0a1628">
                  <animate
                    attributeName="stop-color"
                    dur="6s"
                    repeatCount="indefinite"
                    values="#0a1628;#0f2540;#0a1628;#0a1628"
                  />
                </stop>
                <stop offset="50%" stopColor="#2bb0ff" stopOpacity="0.9">
                  <animate
                    attributeName="stop-color"
                    dur="5s"
                    repeatCount="indefinite"
                    values="#2da3ff;#4ae8ff;#60a5fa;#2da3ff"
                  />
                </stop>
                <stop offset="100%" stopColor="#0d2347" stopOpacity="0.45" />
              </linearGradient>
            </defs>
            {parallelOffsets.map((oy, i) => (
              <g key={`a-${oy}`} transform={`translate(0 ${oy})`}>
                <path
                  fill="none"
                  stroke="url(#loginLgradA)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.1 - i * 0.08}
                  opacity={0.5 - i * 0.06}
                  d={RIBBON_A}
                />
              </g>
            ))}
          </svg>
        </div>
        <div
          className="absolute bottom-0 left-1 w-[95%] animate-vant-login-wave-drift-2"
          style={{ animationDelay: "-3s" }}
        >
          <svg className="h-40 w-full opacity-80" viewBox="0 0 520 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="loginLgradB" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0f2952" stopOpacity="0.75" />
                <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.6">
                  <animate
                    attributeName="stop-color"
                    dur="4s"
                    repeatCount="indefinite"
                    values="#22d3ee;#3b82f6;#67e8f9;#22d3ee"
                  />
                </stop>
                <stop offset="100%" stopColor="#0d2347" stopOpacity="0.35" />
              </linearGradient>
            </defs>
            {LAYER2_PATHS.map((d, j) => (
              <g key={d} transform={j === 1 ? "translate(0 -3)" : ""} opacity={0.45 + j * 0.2}>
                <path
                  fill="none"
                  stroke="url(#loginLgradB)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={j === 0 ? 0.85 : 0.6}
                  d={d}
                />
                <path
                  fill="none"
                  stroke="#7dd3fc"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={0.35}
                  opacity={0.28}
                  d={d}
                />
              </g>
            ))}
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 w-full animate-vant-login-wave-drift-3" style={{ animationDelay: "-1.2s" }}>
          <svg className="h-40 w-full" viewBox="0 0 520 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="loginLgradC" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#172554" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#a5d7ff" stopOpacity="0.9">
                  <animate
                    attributeName="stop-opacity"
                    dur="3s"
                    repeatCount="indefinite"
                    values="0.5;0.95;0.6;0.5"
                  />
                </stop>
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.45" />
              </linearGradient>
              <filter id="loginLineGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g filter="url(#loginLineGlow)">
              <path
                fill="none"
                stroke="url(#loginLgradC)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="0.65"
                d={RIBBON_C}
              />
              <path
                fill="none"
                stroke="#bae6fd"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="0.4"
                opacity={0.45}
                d={RIBBON_C}
              />
            </g>
            {waveSparkles.map((s) => (
              <circle
                key={`${s.cx}-${s.cy}`}
                cx={s.cx}
                cy={s.cy}
                r={s.r}
                fill="#e0f2fe"
                opacity={s.o}
                className="[filter:blur(0.2px)]"
              >
                <animate
                  attributeName="opacity"
                  dur="2.5s"
                  repeatCount="indefinite"
                  values={`${s.o * 0.3};${s.o};${s.o * 0.4};${s.o * 0.3}`}
                />
              </circle>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

export function LoginPromoPanel() {
  return (
    <div className="relative flex min-h-[220px] flex-1 flex-col justify-center overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-gradient-to-br from-slate-950 via-[#0c1222] to-[#0f172a] px-5 py-5 md:min-h-0 md:px-6 md:py-4">
      <div
        className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(hsl(220_30%_98%/0.06)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_80%_70%_at_30%_30%,black,transparent)] md:block"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-12 -top-12 hidden h-40 w-40 rounded-full bg-amber-500/10 blur-2xl md:block"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-10 hidden h-32 w-32 rounded-full bg-violet-600/5 blur-2xl md:block"
        aria-hidden
      />

      <div className="hidden md:contents">
        <LoginWaves />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-sm space-y-4">
        <header className="space-y-2.5">
          <span className="inline-flex w-max items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-200/90">
            Catálogos em PDF
          </span>
          <div className="inline-flex w-max">
            <img
              src={BRAND_LOGO_SRC}
              alt="Vant Studio"
              width={200}
              height={120}
              className="h-10 w-auto max-w-[8.5rem] object-contain object-bottom opacity-95"
            />
          </div>
          <h2 className="font-['Space_Grotesk',sans-serif] text-xl font-bold leading-snug tracking-tight text-white md:text-[1.35rem]">
            Catálogos em PDF,{" "}
            <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              sem complicação
            </span>
          </h2>
          <p className="text-xs leading-snug text-slate-500">
            Cadastre, visualize e exporte — no mesmo fluxo.
          </p>
        </header>

        <ul className="space-y-2">
          {highlights.map(({ icon: Icon, title, text, ring: ringClass }) => (
            <li
              key={title}
              className="flex gap-2.5 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-2 transition-colors hover:border-amber-500/15 hover:bg-white/[0.05] md:backdrop-blur-[2px]"
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md ring-1",
                  ringClass,
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <div className="min-w-0 py-0.5">
                <p className="text-xs font-semibold leading-tight text-slate-100">{title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{text}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="border-t border-white/5 pt-3 text-center text-[10px] uppercase tracking-wider text-slate-600">
          PDF · Pré-visualização · Marca
        </p>
      </div>
    </div>
  );
}
