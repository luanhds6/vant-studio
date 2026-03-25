import { useCallback } from "react";
import { useProductStore } from "@/store/productStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useDropzone } from "react-dropzone";
import { Upload, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const SettingsPage = () => {
  const { settings, updateSettings } = useProductStore();

  const onDrop = useCallback(async (files: File[]) => {
    if (files[0]) {
      const b64 = await fileToBase64(files[0]);
      updateSettings({ logo: b64 });
      toast({ title: "Logo atualizado!" });
    }
  }, [updateSettings]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>

      <Card>
        <CardHeader><CardTitle className="text-lg">Empresa</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da Empresa</Label>
            <Input
              value={settings.nomeEmpresa}
              onChange={(e) => updateSettings({ nomeEmpresa: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Slogan</Label>
            <Input
              value={settings.slogan}
              onChange={(e) => updateSettings({ slogan: e.target.value })}
              placeholder="Ex: Qualidade e confiança"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Logo</CardTitle></CardHeader>
        <CardContent>
          {settings.logo ? (
            <div className="flex items-center gap-4">
              <img src={settings.logo} alt="Logo" className="h-20 max-w-48 object-contain rounded border p-2" />
              <Button variant="outline" size="sm" onClick={() => updateSettings({ logo: "" })}>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
