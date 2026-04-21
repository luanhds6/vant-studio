import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME, BRAND_LOGO_SRC } from "@/brand";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import { getDefaultLandingPath } from "@/lib/routeAccess";
import { LoginPromoPanel } from "@/components/login/LoginPromoPanel";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const [nameMain, ...nameRest] = APP_NAME.trim().split(/\s+/);
  const nameSub = nameRest.join(" ");

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success(result.message);
        const canAccess = useAuthStore.getState().canAccess;
        navigate(getDefaultLandingPath(canAccess), { replace: true });
      } else {
        toast.error(result.message || "Credenciais inválidas. Tente novamente.");
      }
    } catch (error) {
      toast.error("Ocorreu um erro ao tentar fazer login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 md:p-6">
      <div className="absolute right-3 top-3 z-20 md:right-5 md:top-5">
        <ThemeToggle />
      </div>
      <div className="flex h-auto w-full max-w-[900px] min-h-0 flex-col overflow-hidden rounded-[20px] border border-border bg-card shadow-xl md:h-[550px] md:min-h-0 md:flex-row dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_25px_50px_rgba(0,0,0,0.3)] dark:backdrop-blur-[15px]">
        <div className="dark flex min-h-[220px] flex-1 flex-col md:min-h-0">
          <LoginPromoPanel />
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center px-8 py-10 text-foreground md:min-h-0 md:px-10 md:py-8 dark:text-white">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <img
                src={BRAND_LOGO_SRC}
                alt={APP_NAME}
                className="h-20 w-20 rounded-full border-2 border-border object-cover shadow-lg dark:border-white/20"
              />
            </div>
            <h1 className="text-4xl font-bold tracking-[0.12em] dark:text-white">{nameMain}</h1>
            {nameSub ? (
              <span className="mt-1 block text-sm font-light uppercase tracking-[0.25em] text-primary dark:text-amber-400">
                {nameSub}
              </span>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-muted-foreground dark:text-slate-300">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="ti@servbrasil.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-input bg-background dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-500 dark:focus-visible:border-amber-400 dark:focus-visible:ring-amber-400/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-muted-foreground dark:text-slate-300">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-input bg-background dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-500 dark:focus-visible:border-amber-400 dark:focus-visible:ring-amber-400/30"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full py-6 text-base font-bold shadow-none transition hover:-translate-y-0.5 dark:border-0 dark:bg-amber-400 dark:text-[#0f172a] dark:hover:bg-amber-500 dark:hover:text-[#0f172a] dark:hover:shadow-[0_5px_15px_rgba(251,191,36,0.4)]"
            >
              {isLoading ? "Acessando..." : "Acessar catálogo"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground dark:text-slate-500">
            Em caso de dúvidas na senha, fale com o administrador do sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
