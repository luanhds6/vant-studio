import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Camera, Upload, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function ProfilePage() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const updateOwnProfile = useAuthStore((state) => state.updateOwnProfile);
  const changeOwnPassword = useAuthStore((state) => state.changeOwnPassword);

  const [fullName, setFullName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [profilePhoto, setProfilePhoto] = useState(currentUser?.profilePhoto || "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [firstName, lastName] = useMemo(() => {
    const trimmed = fullName.trim();
    if (!trimmed) return ["", ""];
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return [parts[0], ""];
    return [parts[0], parts.slice(1).join(" ")];
  }, [fullName]);

  const onDropProfilePhoto = useCallback(async (files: File[]) => {
    if (files[0]) {
      const b64 = await fileToBase64(files[0]);
      setProfilePhoto(b64);
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: onDropProfilePhoto,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  const updateNameParts = (nextFirstName: string, nextLastName: string) => {
    setFullName(`${nextFirstName} ${nextLastName}`.trim());
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast({
        title: "Erro",
        description: "Nome, sobrenome e e-mail são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const result = updateOwnProfile({ name: fullName, email, profilePhoto });
    if (!result.success) {
      toast({ title: "Erro", description: result.message, variant: "destructive" });
      return;
    }

    toast({ title: "Perfil atualizado!", description: "Seus dados foram salvos." });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "Erro", description: "Preencha todos os campos de senha.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Erro", description: "A confirmação da nova senha não confere.", variant: "destructive" });
      return;
    }

    const result = changeOwnPassword(currentPassword, newPassword);
    if (!result.success) {
      toast({ title: "Erro", description: result.message, variant: "destructive" });
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast({ title: "Senha atualizada!", description: "Sua senha foi alterada com sucesso." });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados do Usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
              <div className="space-y-2">
                <Label>Foto de Perfil</Label>
                {profilePhoto ? (
                  <div className="space-y-3">
                    <img
                      src={profilePhoto}
                      alt="Foto de perfil"
                      className="w-40 h-40 rounded-xl border object-cover bg-muted"
                    />
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" {...getRootProps()}>
                        <input {...getInputProps()} />
                        <Camera className="mr-1 h-3 w-3" />
                        Alterar
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setProfilePhoto("")}>
                        <X className="mr-1 h-3 w-3" />
                        Remover
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    {...getRootProps()}
                    className="h-40 border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors flex flex-col justify-center"
                  >
                    <input {...getInputProps()} />
                    <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Clique ou arraste sua foto</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nome</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => updateNameParts(e.target.value, lastName)}
                      placeholder="Ex: João"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Sobrenome</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => updateNameParts(firstName, e.target.value)}
                      placeholder="Ex: Silva"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profileEmail">E-mail de login</Label>
                  <Input
                    id="profileEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@empresa.com"
                  />
                </div>
              </div>
            </div>

            <Button type="submit">Salvar Dados do Perfil</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Troca de Senha — {fullName || currentUser?.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <Label>Login atual</Label>
              <Input value={email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button type="submit">Atualizar Senha</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
