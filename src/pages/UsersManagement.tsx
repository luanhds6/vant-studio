import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyPlus, Pencil, Trash2, ShieldAlert, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ALL_PERMISSIONS,
  DEFAULT_USER_PERMISSIONS,
  PERMISSION_HELP,
  PERMISSION_LABELS,
  PermissionKey,
} from "@/lib/permissions";

interface UsersManagementProps {
  embedded?: boolean;
}

export default function UsersManagement({ embedded = false }: UsersManagementProps) {
  const { users, currentUser, addUser, updateUser, deleteUser, canAccess } = useAuthStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [defineNewPassword, setDefineNewPassword] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "admin" | "user",
    passwordType: "temporary" as "temporary" | "permanent",
    permissions: [...DEFAULT_USER_PERMISSIONS] as PermissionKey[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!canAccess("usuarios")) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Acesso Negado</h2>
        <p className="text-muted-foreground mt-2">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "user",
      passwordType: "temporary",
      permissions: [...DEFAULT_USER_PERMISSIONS],
    });
    setEditingUserId(null);
    setDefineNewPassword(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      passwordType: user.mustChangePassword ? "temporary" : "permanent",
      permissions: user.permissions || [],
    });
    setDefineNewPassword(false);
    setIsDialogOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEditing = !!editingUserId;
    const needsPassword = !isEditing || defineNewPassword;

    if (!formData.name || !formData.email || (needsPassword && !formData.password)) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (needsPassword && formData.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (formData.role !== "admin" && formData.permissions.length === 0) {
      toast.error("Selecione pelo menos uma permissão para o usuário.");
      return;
    }

    const emailTaken = users.some(
      (u) => u.email === formData.email && (!isEditing || u.id !== editingUserId)
    );
    if (emailTaken) {
      toast.error("Já existe um usuário com este e-mail.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        const updates: Partial<{
          name: string;
          email: string;
          role: "admin" | "user";
          password: string;
          mustChangePassword: boolean;
          permissions: PermissionKey[];
        }> = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          permissions: formData.role === "admin" ? ALL_PERMISSIONS : formData.permissions,
        };

        if (defineNewPassword) {
          updates.password = formData.password;
          updates.mustChangePassword = formData.passwordType === "temporary";
        }

        if (editingUserId === currentUser?.id && formData.role !== "admin") {
          toast.error("Você não pode remover seu próprio perfil de administrador.");
          setIsSubmitting(false);
          return;
        }

        await updateUser(editingUserId!, updates);
        toast.success("Usuário atualizado com sucesso!");
      } else {
        await addUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          mustChangePassword: formData.passwordType === "temporary",
          permissions: formData.role === "admin" ? ALL_PERMISSIONS : formData.permissions,
        });
        toast.success("Usuário criado com sucesso!");
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Erro ao salvar usuário.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (id === currentUser?.id) {
      toast.error("Você não pode excluir sua própria conta.");
      return;
    }
    if (confirm(`Tem certeza que deseja excluir o usuário ${name}?`)) {
      try {
        await deleteUser(id);
        toast.success("Usuário excluído com sucesso.");
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Erro ao excluir usuário.";
        toast.error(msg);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`${embedded ? "text-2xl" : "text-3xl"} font-bold tracking-tight`}>Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground mt-1">
            Controle de acesso à plataforma de catálogos
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <CopyPlus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingUserId ? "Editar Usuário" : "Adicionar Usuário"}</DialogTitle>
              <DialogDescription>
                {editingUserId
                  ? "Atualize dados, permissões e senha deste usuário."
                  : "Crie um novo acesso para gerentes do catálogo."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveUser} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  placeholder="Nome do Usuário"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  placeholder="email@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="password">Senha</Label>
                  {editingUserId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDefineNewPassword((prev) => !prev);
                        setFormData((prev) => ({ ...prev, password: "" }));
                      }}
                    >
                      {defineNewPassword ? "Manter senha atual" : "Definir nova senha"}
                    </Button>
                  )}
                </div>
                {(!editingUserId || defineNewPassword) && (
                  <>
                    <Input 
                      id="password" 
                      type="text" 
                      value={formData.password} 
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="Mínimo de 6 caracteres"
                    />
                    <div className="space-y-2">
                      <Label htmlFor="passwordType">Tipo de Senha</Label>
                      <Select
                        value={formData.passwordType}
                        onValueChange={(val: "temporary" | "permanent") => setFormData({ ...formData, passwordType: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="temporary">Temporária (usuário deve trocar depois)</SelectItem>
                          <SelectItem value="permanent">Permanente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Nível de Acesso</Label>
                <Select
                  value={formData.role}
                  onValueChange={(val: "admin" | "user") =>
                    setFormData((prev) => ({
                      ...prev,
                      role: val,
                      permissions:
                        val === "admin"
                          ? ALL_PERMISSIONS
                          : prev.permissions.length > 0
                            ? prev.permissions.filter((p) => ALL_PERMISSIONS.includes(p))
                            : [...DEFAULT_USER_PERMISSIONS],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o papel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário Comum (Acesso a Catálogos)</SelectItem>
                    <SelectItem value="admin">Administrador Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label>Permissões de Acesso</Label>
                {formData.role === "admin" ? (
                  <p className="text-sm text-muted-foreground">
                    Administrador possui acesso completo a todas as funcionalidades.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 rounded-md border p-3">
                    {ALL_PERMISSIONS.map((permission) => (
                      <label key={permission} className="flex cursor-pointer gap-3 text-sm">
                        <Checkbox
                          className="mt-0.5 shrink-0"
                          checked={formData.permissions.includes(permission)}
                          onCheckedChange={(checked) => {
                            setFormData((prev) => {
                              const checkedValue = checked === true;
                              return {
                                ...prev,
                                permissions: checkedValue
                                  ? Array.from(new Set([...prev.permissions, permission]))
                                  : prev.permissions.filter((p) => p !== permission),
                              };
                            });
                          }}
                        />
                        <span className="min-w-0 space-y-0.5 leading-snug">
                          <span className="font-medium text-foreground">{PERMISSION_LABELS[permission]}</span>
                          <span className="block text-xs text-muted-foreground">{PERMISSION_HELP[permission]}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : editingUserId ? "Salvar Alterações" : "Salvar Usuário"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground'
                  }`}>
                    {user.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <Users className="w-3 h-3 mr-1" />}
                    {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                  </span>
                </TableCell>
                <TableCell>{new Date(user.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(user.id)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id, user.name)} disabled={user.id === currentUser?.id} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
