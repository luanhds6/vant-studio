import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock } from "lucide-react";

/**
 * Bloqueia o restante da app até o utilizador definir nova senha (conta com senha temporária).
 */
export function MandatoryPasswordChangeModal() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const completeMandatoryPasswordChange = useAuthStore(
    (s) => s.completeMandatoryPasswordChange
  );

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!currentUser?.mustChangePassword) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("A confirmação não coincide com a nova senha.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await completeMandatoryPasswordChange(password);
      if (result.success) {
        toast.success("Senha atualizada. Bem-vindo.");
        setPassword("");
        setConfirm("");
      } else {
        toast.error(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent
        hideClose
        className="z-[300] sm:max-w-md"
        aria-describedby="mandatory-password-desc"
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="h-6 w-6" aria-hidden />
            </div>
            <DialogTitle className="text-center">Alteração de senha obrigatória</DialogTitle>
            <DialogDescription
              id="mandatory-password-desc"
              className="text-center text-balance"
            >
              A sua conta foi criada com uma{" "}
              <strong>senha temporária</strong>. Por segurança, defina uma nova
              senha agora. Só depois poderá utilizar o sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="mandatory-new-password">Nova senha</Label>
              <Input
                id="mandatory-new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                disabled={submitting}
                className="border-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mandatory-confirm-password">Confirmar nova senha</Label>
              <Input
                id="mandatory-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={6}
                required
                disabled={submitting}
                className="border-input"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
              {submitting ? "A guardar…" : "Confirmar nova senha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
