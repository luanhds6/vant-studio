import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Camera, Loader2, Upload, X } from "lucide-react";
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
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.name || "");
      setEmail(currentUser.email || "");
      setProfilePhoto(currentUser.profilePhoto || "");
    }
  }, [currentUser]);

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast({
        title: "Erro",
        description: "Nome e e-mail são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setSavingProfile(true);
    try {
      const result = await updateOwnProfile({ name: fullName, email, profilePhoto });
      if (!result.success) {
        toast({ title: "Erro", description: result.message, variant: "destructive" });
        return;
      }
      toast({ title: "Perfil atualizado", description: "As suas informações foram guardadas." });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "Erro", description: "Preencha todos os campos de senha.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Erro", description: "A confirmação da nova senha não confere.", variant: "destructive" });
      return;
    }

    setSavingPassword(true);
    try {
      const result = await changeOwnPassword(currentPassword, newPassword);
      if (!result.success) {
        toast({ title: "Erro", description: result.message, variant: "destructive" });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Senha atualizada", description: "A sua palavra-passe foi alterada com sucesso." });
    } finally {
      setSavingPassword(false);
    }
  };

  if (!currentUser) {
    return <p className="text-muted-foreground">A carregar perfil…</p>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados do Usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
              <div className="space-y-2">
                <Label>Foto de Perfil</Label>
                {profilePhoto ? (
                  <div className="space-y-3">
                    <img
                      src={profilePhoto}
                      alt="Foto de perfil"
                      className="h-40 w-40 rounded-xl border object-cover bg-muted"
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
                    className="flex h-40 cursor-pointer flex-col justify-center rounded-xl border-2 border-dashed p-4 text-center transition-colors hover:border-primary/50"
                  >
                    <input {...getInputProps()} />
                    <Upload className="mb-2 mx-auto h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Clique ou arraste sua foto</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  <p className="text-xs text-muted-foreground">
                    Se alterar o e-mail, o Supabase pode enviar confirmação. Use o link recebido para concluir.
                  </p>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A guardar…
                </>
              ) : (
                "Salvar dados do perfil"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Troca de palavra-passe — {fullName || currentUser.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="max-w-lg space-y-4">
            <div className="space-y-2">
              <Label>Login atual</Label>
              <Input value={email} disabled readOnly className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Palavra-passe atual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova palavra-passe</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova palavra-passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A atualizar…
                </>
              ) : (
                "Atualizar palavra-passe"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
