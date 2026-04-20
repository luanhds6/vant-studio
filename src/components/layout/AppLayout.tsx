import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getAppVersionLabel } from "@/lib/appVersion";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "./ThemeToggle";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const versionLabel = getAppVersionLabel();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="relative flex min-h-0 flex-1 flex-col">
          <header className="flex h-14 items-center gap-2 border-b border-border/80 bg-card/60 px-4 backdrop-blur-md">
            <SidebarTrigger className="mr-2 shrink-0" />
            <span className="min-w-0 flex-1 truncate font-['Space_Grotesk',sans-serif] text-base font-semibold tracking-tight text-foreground">
              Catálogos
            </span>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">{children}</main>
          <p
            className="pointer-events-none fixed bottom-2 right-3 z-30 select-none font-mono text-[10px] leading-tight text-muted-foreground/60 tabular-nums"
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