import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(email, password);
    if (success) {
      toast.success("Login efetuado com sucesso!");
      navigate("/");
    } else {
      toast.error("Credenciais inválidas. Tente novamente.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm shadow-xl border-t-4 border-t-primary">
        <CardHeader className="space-y-1 text-center pb-8 pt-6">
          <div className="flex justify-center mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary shadow-sm">
              <Zap className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Login do Sistema</CardTitle>
          <CardDescription>
            Insira suas credenciais administrativas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="ti@servbrasil.com.br" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background"
              />
            </div>
            <Button type="submit" className="w-full font-medium mt-2">Entrar no Sistema</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
