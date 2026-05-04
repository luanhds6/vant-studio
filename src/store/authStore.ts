import { create } from "zustand";
import { FunctionsHttpError } from "@supabase/functions-js";
import {
  clearInvalidSupabaseSession,
  getSessionAccessTokenOrThrow,
  isInvalidStoredSessionError,
  supabase,
} from "@/lib/supabase";
import {
  ALL_PERMISSIONS,
  PermissionKey,
  hasUserPermission,
  normalizePermissions,
  normalizeRole,
} from "@/lib/permissions";

/** Constrói `User` a partir da linha `profiles` com papel e permissões normalizados (admin = lista completa). */
function mapProfileToUser(
  profile: {
    id: string;
    name: string | null;
    email: string | null;
    profile_photo?: string | null;
    role: string | null;
    must_change_password?: boolean | null;
    permissions?: unknown;
    created_at: string;
  },
  sessionEmail?: string | null
): User {
  const role = normalizeRole(profile.role);
  return {
    id: profile.id,
    name: profile.name || "",
    email: profile.email || sessionEmail || "",
    profilePhoto: profile.profile_photo || "",
    role,
    mustChangePassword: Boolean(profile.must_change_password),
    permissions: normalizePermissions(role, profile.permissions as PermissionKey[]),
    createdAt: profile.created_at,
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  profilePhoto?: string;
  role: 'admin' | 'user';
  mustChangePassword: boolean;
  permissions: PermissionKey[];
  createdAt: string;
}

type NewUserInput = Omit<User, "id" | "createdAt"> & { password: string };

interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  addUser: (user: NewUserInput) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  /** O próprio utilizador: nome, e-mail, foto (tabela public.profiles + Auth se o e-mail mudar). */
  updateOwnProfile: (payload: {
    name: string;
    email: string;
    profilePhoto?: string;
  }) => Promise<{ success: boolean; message: string }>;
  /** Revalida a senha atual e define uma nova. */
  changeOwnPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  /** Após login com senha temporária: define nova senha e remove a obrigatoriedade no perfil. */
  completeMandatoryPasswordChange: (newPassword: string) => Promise<{ success: boolean; message: string }>;
  canAccess: (permission: PermissionKey) => boolean;
  fetchUsers: () => Promise<void>;
}

let authStateListenerAttached = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  currentUser: null,
  users: [],
  isLoading: true,

  initialize: async () => {
    try {
      let {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError && isInvalidStoredSessionError(sessionError)) {
        console.warn(
          "Sessão guardada inválida ou expirada; a limpar tokens locais.",
          sessionError.message
        );
        await clearInvalidSupabaseSession();
        ({
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession());
      }

      if (sessionError && !session) {
        console.error("Erro ao buscar sessão no Supabase Auth:", sessionError);
      }

      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Erro ao buscar perfil na inicialização:', profileError.message, profileError);
        }

        if (profile) {
          const user = mapProfileToUser(profile, session.user.email);
          set({ isAuthenticated: true, currentUser: user, isLoading: false });
          if (user.role === 'admin') {
            get().fetchUsers();
          }
        } else {
          set({ isAuthenticated: false, currentUser: null, isLoading: false });
        }
      } else {
        set({ isAuthenticated: false, currentUser: null, isLoading: false });
      }
    } catch (err) {
      console.error("Erro crítico na inicialização do sistema:", err);
      set({ isAuthenticated: false, currentUser: null, isLoading: false });
    }

    if (authStateListenerAttached) {
      return;
    }
    authStateListenerAttached = true;

    const { data: authSub } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === "SIGNED_IN" && session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error("Erro ao carregar perfil após SIGNED_IN:", profileError.message, profileError);
          }

          if (profile) {
            const user = mapProfileToUser(profile, session.user.email);
            set({ isAuthenticated: true, currentUser: user });
            if (user.role === "admin") {
              get().fetchUsers();
            }
          }
        } else if (event === "SIGNED_OUT") {
          set({ isAuthenticated: false, currentUser: null, users: [] });
        }
      } catch (err) {
        console.error("Erro no listener de autenticação:", err);
      }
    });
    void authSub.subscription;
  },

  login: async (email, password) => {
    try {
      const { data: { user: authUser }, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        console.error('Falha na tentativa de login no Supabase Auth:', loginError);
        return { success: false, message: loginError.message };
      }

      if (authUser) {
        // Fetch profile immediately to update state before returning
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profileError) {
          console.error('Erro ao buscar perfil após login:', profileError.message, profileError);
          return { success: false, message: `Erro no banco de dados: ${profileError.message}` };
        }

        if (!profile) {
          console.error('Perfil não encontrado para o ID:', authUser.id);
          return { success: false, message: 'Seu perfil de usuário não foi encontrado. Entre em contato com o suporte.' };
        }

        if (profile) {
          const user = mapProfileToUser(profile, authUser.email);
          set({ isAuthenticated: true, currentUser: user });
          if (user.role === 'admin') {
            get().fetchUsers();
          }
          return { success: true, message: 'Login realizado com sucesso!' };
        }
      }

      return { success: false, message: 'Usuário não encontrado.' };
    } catch (err) {
      console.error('Erro inesperado durante o login:', err);
      return { success: false, message: 'Ocorreu um erro inesperado ao fazer login.' };
    }
  },

  logout: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erro ao deslogar no Supabase:', error);
      }
    } catch (err) {
      console.error('Erro inesperado no logout:', err);
    }
  },

  fetchUsers: async () => {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*');

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    const users: User[] = profiles.map((p) => mapProfileToUser(p));

    set({ users });
  },

  addUser: async (userData) => {
    const { currentUser } = get();
    if (!currentUser || !hasUserPermission(currentUser.role, currentUser.permissions, "usuarios")) {
      throw new Error("Sem permissão para criar usuários.");
    }

    const {
      data: { session: adminSession },
    } = await supabase.auth.getSession();
    if (!adminSession?.access_token || !adminSession.refresh_token) {
      throw new Error("Sessão inválida. Entre novamente.");
    }

    const email = userData.email.trim();
    const name = userData.name.trim();

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: userData.password,
      options: {
        data: { name },
      },
    });

    const restoreAdminSession = async () => {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });
      if (sessionError) {
        console.error("Erro ao restaurar sessão do administrador:", sessionError);
      }
    };

    if (signUpError) {
      throw signUpError;
    }

    await restoreAdminSession();

    const newUserId = signUpData.user?.id;
    if (!newUserId) {
      throw new Error(
        "Conta não criada: confira no Supabase se o registo público está permitido e se a confirmação por e-mail não bloqueia a criação."
      );
    }

    const roleStored = normalizeRole(userData.role);
    const permissionsStored =
      roleStored === "admin"
        ? ALL_PERMISSIONS
        : userData.permissions;

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: newUserId,
        name,
        email,
        role: roleStored,
        permissions: permissionsStored,
        must_change_password: userData.mustChangePassword,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.error("Erro ao guardar perfil do novo usuário:", profileError);
      throw profileError;
    }

    await get().fetchUsers();
  },

  updateUser: async (id, updates) => {
    const roleNorm =
      updates.role !== undefined ? normalizeRole(updates.role as string) : undefined;
    const permissionsDb =
      roleNorm === "admin"
        ? ALL_PERMISSIONS
        : updates.permissions;

    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (roleNorm !== undefined) patch.role = roleNorm;
    if (permissionsDb !== undefined) patch.permissions = permissionsDb;
    if (updates.profilePhoto !== undefined) patch.profile_photo = updates.profilePhoto;
    if (updates.mustChangePassword !== undefined)
      patch.must_change_password = updates.mustChangePassword;

    const { error } = await supabase.from("profiles").update(patch).eq("id", id);

    if (error) {
      console.error("Error updating user:", error);
      throw error;
    }

    get().fetchUsers();
  },

  updateOwnProfile: async (payload) => {
    const { currentUser } = get();
    if (!currentUser) {
      return { success: false, message: "Sessão inválida. Entre novamente." };
    }

    const name = payload.name.trim();
    const email = payload.email.trim();
    const profilePhoto = payload.profilePhoto ?? "";

    if (!name || !email) {
      return { success: false, message: "Nome e e-mail são obrigatórios." };
    }

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          name,
          email,
          profile_photo: profilePhoto || null,
        })
        .eq("id", currentUser.id);

      if (profileError) {
        console.error("Erro ao guardar perfil:", profileError);
        return { success: false, message: profileError.message || "Não foi possível guardar o perfil." };
      }

      if (email.toLowerCase() !== currentUser.email.toLowerCase()) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) {
          return {
            success: false,
            message: emailError.message || "E-mail: confirme na caixa de entrada ou tente de novo.",
          };
        }
      }

      set({
        currentUser: {
          ...currentUser,
          name,
          email,
          profilePhoto,
        },
      });

      return { success: true, message: "ok" };
    } catch (err) {
      console.error("updateOwnProfile:", err);
      return { success: false, message: "Erro inesperado ao guardar o perfil." };
    }
  },

  changeOwnPassword: async (currentPassword, newPassword) => {
    const { currentUser } = get();
    if (!currentUser) {
      return { success: false, message: "Sessão inválida. Entre novamente." };
    }
    if (newPassword.length < 6) {
      return { success: false, message: "A nova senha deve ter pelo menos 6 caracteres." };
    }

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: currentPassword,
    });
    if (signErr) {
      return { success: false, message: "Senha atual incorreta." };
    }

    const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
    if (updErr) {
      return { success: false, message: updErr.message || "Não foi possível alterar a senha." };
    }

    return { success: true, message: "ok" };
  },

  completeMandatoryPasswordChange: async (newPassword: string) => {
    const { currentUser } = get();
    if (!currentUser) {
      return { success: false, message: "Sessão inválida. Entre novamente." };
    }
    if (!currentUser.mustChangePassword) {
      return { success: true, message: "ok" };
    }
    if (newPassword.length < 6) {
      return {
        success: false,
        message: "A nova senha deve ter pelo menos 6 caracteres.",
      };
    }

    const { error: authErr } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (authErr) {
      return {
        success: false,
        message: authErr.message || "Não foi possível definir a nova senha.",
      };
    }

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", currentUser.id);

    if (profileErr) {
      return {
        success: false,
        message:
          profileErr.message ||
          "Senha atualizada, mas não foi possível atualizar o perfil. Tente de novo ou contacte o suporte.",
      };
    }

    set({
      currentUser: {
        ...currentUser,
        mustChangePassword: false,
      },
    });

    return { success: true, message: "ok" };
  },

  deleteUser: async (id) => {
    const { currentUser } = get();
    if (!currentUser) {
      throw new Error("Sessão inválida.");
    }
    if (id === currentUser.id) {
      throw new Error("Não é possível excluir a própria conta.");
    }
    if (!hasUserPermission(currentUser.role, currentUser.permissions, "usuarios")) {
      throw new Error("Sem permissão para excluir utilizadores.");
    }

    const accessToken = await getSessionAccessTokenOrThrow();

    const { data, error } = await supabase.functions.invoke<{
      ok?: boolean;
      error?: string;
    }>("delete-user", {
      body: { userId: id },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try {
          const j = (await error.context.json()) as { error?: string };
          if (j?.error) msg = j.error;
        } catch {
          /* resposta não JSON */
        }
      }
      throw new Error(msg);
    }
    if (data?.error) {
      throw new Error(data.error);
    }

    await get().fetchUsers();
  },

  canAccess: (permission) => {
    const { currentUser } = get();
    if (!currentUser) return false;
    return hasUserPermission(currentUser.role, currentUser.permissions, permission);
  },
}));
