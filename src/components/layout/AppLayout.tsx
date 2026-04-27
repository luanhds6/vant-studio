import { Bell, Search } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getAppVersionLabel } from "@/lib/appVersion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "./ThemeToggle";
import { SystemWavesBackground } from "./SystemWavesBackground";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const versionLabel = getAppVersionLabel();

  return (
    <SidebarProvider className="relative min-h-svh overflow-x-hidden">
      <div className="vant-app-bg" aria-hidden />
      <SystemWavesBackground />
      <div className="relative z-[1] flex min-h-svh w-full">
        <AppSidebar />
        <div className="relative flex min-h-0 flex-1 flex-col bg-transparent">
          <header className="vant-topbar-glass sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b px-4 shadow-sm md:px-6">
            <SidebarTrigger className="h-9 w-9 shrink-0 rounded-xl border border-border/50 bg-background/70 shadow-sm transition duration-300 ease-out hover:scale-[1.03] hover:shadow-md" />
            <span className="min-w-0 shrink truncate font-['Space_Grotesk',sans-serif] text-base font-semibold tracking-tight text-foreground md:text-lg">
              Catálogos
            </span>
            <div className="mx-4 hidden min-w-0 max-w-xl flex-1 md:block">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  readOnly
                  tabIndex={-1}
                  placeholder="Buscar hospitais, produtos…"
                  aria-label="Campo de busca (em breve)"
                  className="h-10 rounded-full border-border/60 bg-background/70 pl-10 pr-4 shadow-inner transition duration-300 placeholder:text-muted-foreground/80 focus-visible:border-primary/40 focus-visible:ring-primary/30"
                />
              </div>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-muted-foreground transition duration-300 ease-out hover:scale-[1.05] hover:bg-primary/10 hover:text-primary"
                title="Notificações"
              >
                <Bell className="h-4 w-4" aria-hidden />
              </Button>
              <ThemeToggle className="h-9 w-9 rounded-full border border-border/40 bg-background/50 transition duration-300 ease-out hover:scale-[1.05]" />
            </div>
          </header>
          <main className="relative flex-1 overflow-auto bg-transparent px-5 py-8 md:px-8">
            {children}
          </main>
          <p
            className="pointer-events-none fixed bottom-2 right-3 z-30 select-none font-mono text-[10px] leading-tight text-muted-foreground/50 tabular-nums"
            title={`Versão do sistema ${versionLabel}`}
            aria-hidden
          >
            v{versionLabel}
          </p>
        </div>
      </div>
    </SidebarProvider>
  );
}
