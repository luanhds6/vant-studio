import { useState } from "react";
import { useProductStore } from "@/store/productStore";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Plus, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const generateId = () => crypto.randomUUID();

const ColorsPage = () => {
  const navigate = useNavigate();
  const colors = useProductStore((s) => s.colors);
  const addColor = useProductStore((s) => s.addColor);
  const deleteColor = useProductStore((s) => s.deleteColor);
  const canAccess = useAuthStore((s) => s.canAccess);

  const [nome, setNome] = useState("");
  const [hex, setHex] = useState("#000000");

  const handleAdd = async () => {
    const n = nome.trim();
    if (!n) {
      toast({ title: "Informe o nome da cor", variant: "destructive" });
      return;
    }
    try {
      await addColor({
        id: generateId(),
        nome: n,
        hex: hex,
      });
      setNome("");
      setHex("#000000");
      toast({ title: "Cor cadastrada com sucesso" });
    } catch (error) {
      toast({ title: "Erro ao cadastrar cor", variant: "destructive" });
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Cores</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nova Cor</CardTitle>
            <CardDescription>Cadastre cores para usar nos produtos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="color-name">Nome da Cor</Label>
              <Input
                id="color-name"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Verde Hospitalar"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color-hex">Cor</Label>
              <div className="flex gap-2">
                <Input
                  id="color-hex"
                  type="color"
                  value={hex}
                  onChange={(e) => setHex(e.target.value)}
                  className="h-10 w-20 p-1"
                />
                <Input
                  value={hex}
                  onChange={(e) => setHex(e.target.value)}
                  placeholder="#000000"
                  className="font-mono"
                />
              </div>
            </div>
            <Button className="w-full" onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Cor
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cores Cadastradas</CardTitle>
            <CardDescription>Lista de cores disponíveis no sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 [scrollbar-width:thin]">
              {colors.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Palette className="mx-auto h-8 w-8 mb-2 opacity-20" />
                  <p>Nenhuma cor cadastrada.</p>
                </div>
              ) : (
                colors.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full border shadow-sm"
                        style={{ backgroundColor: c.hex }}
                      />
                      <div>
                        <p className="font-medium text-sm">{c.nome}</p>
                        <p className="text-xs text-muted-foreground font-mono uppercase">{c.hex}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteColor(c.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ColorsPage;
