import { useState, useEffect, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useProductStore } from "@/store/productStore";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useDropzone } from "react-dropzone";
import { Upload, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import UsersManagement from "./UsersManagement";

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const SettingsPage = () => {
  const { settings, updateSettings, isLoading: productLoading } = useProductStore(
    useShallow((s) => ({
      settings: s.settings,
      updateSettings: s.updateSettings,
      isLoading: s.isLoading,
    })),
  );
  const [localSettings, setLocalSettings] = useState({
    nomeEmpresa: settings.nomeEmpresa,
    slogan: settings.slogan,
  });
  /** Só preenche nome/slogan a partir do servidor na primeira carga (não apaga edições ao mudar só a logo). */
  const [formHydrated, setFormHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const canAccess = useAuthStore((state) => state.canAccess);

  useEffect(() => {
    if (productLoading || formHydrated) return;
    setLocalSettings({
      nomeEmpresa: settings.nomeEmpresa,
      slogan: settings.slogan,
    });
    setFormHydrated(true);
  }, [productLoading, settings.nomeEmpresa, settings.slogan, formHydrated]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(localSettings);
      toast({ title: "Configurações guardadas" });
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Tente de novo ou verifique a ligação ao servidor.";
      toast({ title: "Não foi possível guardar", description: msg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files[0]) return;
      try {
        const b64 = await fileToBase64(files[0]);
        await updateSettings({ logo: b64 });
        toast({ title: "Logo guardado" });
      } catch {
        toast({ title: "Não foi possível guardar o logo", variant: "destructive" });
      }
    },
    [updateSettings],
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  const canConfigEmpresa = canAccess("configuracoes");

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>

      {canConfigEmpresa ? (
      <Card>
        <CardHeader><CardTitle className="text-lg">Empresa</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Empresa</Label>
              <Input
                value={localSettings.nomeEmpresa}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, nomeEmpresa: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Slogan</Label>
              <Input
                value={localSettings.slogan}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, slogan: e.target.value }))}
                placeholder="Ex: Qualidade e confiança"
              />
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Logo da Empresa</Label>
            {settings.logo ? (
              <div className="flex flex-col items-start gap-4">
                <img src={settings.logo} alt="Logo" className="h-28 max-w-64 object-contain rounded border p-2 bg-background" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await updateSettings({ logo: "" });
                      toast({ title: "Logo removido" });
                    } catch {
                      toast({ title: "Não foi possível remover o logo", variant: "destructive" });
                    }
                  }}
                >
                  <X className="mr-1 h-3 w-3" /> Remover
                </Button>
              </div>
            ) : (
              <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                <input {...getInputProps()} />
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Arraste ou clique para adicionar o logo</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      ) : null}

      {canAccess("usuarios") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cadastro de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <UsersManagement embedded />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SettingsPage;
