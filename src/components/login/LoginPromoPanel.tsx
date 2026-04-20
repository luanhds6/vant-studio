import { APP_NAME } from "@/brand";
import { BookOpen, FileDown, Layers } from "lucide-react";

const highlights = [
  {
    icon: BookOpen,
    title: "PDF em um clique",
    text: "Catálogo padronizado, sem retrabalho manual.",
  },
  {
    icon: Layers,
    title: "Produtos organizados",
    text: "Fotos, medidas, cores e detalhes técnicos juntos.",
  },
  {
    icon: FileDown,
    title: "Prévia antes de enviar",
    text: "Confira o layout e só então exporte.",
  },
];

export function LoginPromoPanel() {
  return (
    <div className="relative flex min-h-[220px] flex-1 flex-col justify-center overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-gradient-to-br from-slate-950 via-[#0c1222] to-[#0f172a] px-5 py-5 md:min-h-0 md:px-6 md:py-4">
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-violet-600/10 blur-2xl"
        aria-hidden
      />

      <div className="relative z-10 mx-auto w-full max-w-sm space-y-4">
        <header className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-400/90">
            {APP_NAME}
          </p>
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
          {highlights.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="flex gap-2.5 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-2 transition-colors hover:border-amber-500/15 hover:bg-white/[0.05]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-400/12 text-amber-400 ring-1 ring-amber-400/15">
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
