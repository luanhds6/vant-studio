import { create } from "zustand";
import { FunctionsHttpError } from "@supabase/functions-js";
import {
  clearInvalidSupabaseSession,
  getSessionAccessTokenOrThrow,
  isInvalidStoredSessionError,
  supabase,
} from "@/lib/supabase";
import {
  checkLoginAllowed,
  clearLoginAttempts,
  recordLoginFailure,
} from "@/lib/security/loginThrottle";
import { sanitizeForLog, toSafeUserMessage } from "@/lib/security/sanitize";
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

/** Atualização pelo painel de utilizadores (senha vai para Auth via Edge Function). */
export type AdminUserUpdate = Partial<User> & { password?: string };

interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  addUser: (user: NewUserInput) => Promise<void>;
  updateUser: (id: string, updates: AdminUserUpdate) => Promise<void>;
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

/** Evita UI presa em «Salvando…» se a Edge Function não responder (rede, função não implantada, etc.). */
function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

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
        /** `initialize()` já aplicou a sessão inicial; repetir aqui duplica pedidos a `profiles` e deixa a UI mais lenta. */
        if (event === "INITIAL_SESSION") {
          return;
        }

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
    const throttle = checkLoginAllowed(email);
    if (!throttle.allowed) {
      const minutes = Math.ceil((throttle.retryAfterMs ?? 0) / 60_000);
      return {
        success: false,
        message: `Muitas tentativas. Aguarde ${minutes} minuto(s) e tente novamente.`,
      };
    }

    try {
      const { data: { user: authUser }, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        recordLoginFailure(email);
        console.error('Falha na tentativa de login:', sanitizeForLog(loginError));
        return {
          success: false,
          message: toSafeUserMessage(
            'Credenciais inválidas. Verifique e-mail e palavra-passe.',
            loginError.message,
          ),
        };
      }

      clearLoginAttempts(email);

      if (authUser) {
        // Fetch profile immediately to update state before returning
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profileError) {
          console.error('Erro ao buscar perfil após login:', sanitizeForLog(profileError));
          return {
            success: false,
            message: toSafeUserMessage(
              'Não foi possível carregar o seu perfil. Contacte o administrador.',
              profileError.message,
            ),
          };
        }

        if (!profile) {
          console.error('Perfil não encontrado para utilizador autenticado.');
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
    set({ isAuthenticated: false, currentUser: null, users: [] });
    try {
      /**
       * `signOut()` sem opções tenta revogar tokens no servidor e pode bloquear em rede lenta.
       * Limpar primeiro em local devolve o utilizador ao login de imediato; o listener aplica SIGNED_OUT em redundância.
       */
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        console.error("Erro ao deslogar (sessão local):", error);
        await clearInvalidSupabaseSession();
      }
    } catch (err) {
      console.error("Erro inesperado no logout:", err);
      await clearInvalidSupabaseSession();
    }
    void supabase.auth.signOut({ scope: "global" }).catch(() => {
      /* revogação no servidor: melhor-esforço, não bloqueia UI */
    });
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

    const email = userData.email.trim();
    const name = userData.name.trim();

    const roleStored = normalizeRole(userData.role);
    const permissionsStored =
      roleStored === "admin"
        ? ALL_PERMISSIONS
        : userData.permissions;

    await getSessionAccessTokenOrThrow();

    const { data: fnData, error: fnError } = await withTimeout(
      supabase.functions.invoke<{
        ok?: boolean;
        userId?: string;
        error?: string;
      }>("create-user", {
        body: {
          email,
          password: userData.password,
          name,
          role: roleStored,
        },
      }),
      45_000,
      "Tempo esgotado ao criar utilizador no servidor. Confirme no Supabase que a Edge Function «create-user» está implantada e que a rede permite HTTPS.",
    );

    if (fnError) {
      let msg = fnError.message;
      if (fnError instanceof FunctionsHttpError) {
        try {
          const j = (await fnError.context.json()) as { error?: string };
          if (j?.error) msg = j.error;
        } catch {
          /* ignore */
        }
      }
      throw new Error(msg);
    }
    if (fnData?.error) {
      throw new Error(fnData.error);
    }

    const newUserId = fnData?.userId;
    if (!newUserId) {
      throw new Error("Conta não criada: resposta inválida do servidor.");
    }

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
    const pwdRaw = updates.password?.trim() ?? "";
    const existing = get().users.find((u) => u.id === id);
    const emailTrim =
      updates.email !== undefined ? updates.email.trim() : undefined;
    const emailChanged =
      emailTrim !== undefined &&
      existing !== undefined &&
      emailTrim.toLowerCase() !== (existing.email || "").toLowerCase();

    const needsAuthUpdate =
      pwdRaw.length > 0 ||
      (emailChanged && emailTrim !== undefined);

    if (needsAuthUpdate) {
      await getSessionAccessTokenOrThrow();
      const body: { userId: string; password?: string; email?: string } = {
        userId: id,
      };
      if (pwdRaw.length > 0) body.password = pwdRaw;
      if (emailChanged && emailTrim) body.email = emailTrim;

      const { data, error } = await withTimeout(
        supabase.functions.invoke<{
          ok?: boolean;
          error?: string;
        }>("update-user-auth", {
          body,
        }),
        45_000,
        "Tempo esgotado ao atualizar senha/e-mail no servidor. Confirme no Supabase que a Edge Function «update-user-auth» está implantada e ativa (projeto correto e URL no .env).",
      );

      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const j = (await error.context.json()) as { error?: string };
            if (j?.error) msg = j.error;
          } catch {
            /* ignore */
          }
        }
        throw new Error(msg);
      }
      if (data?.error) {
        throw new Error(data.error);
      }
    }

    const roleNorm =
      updates.role !== undefined ? normalizeRole(updates.role as string) : undefined;
    const permissionsDb =
      roleNorm === "admin"
        ? ALL_PERMISSIONS
        : updates.permissions;

    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (emailTrim !== undefined) patch.email = emailTrim;
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

    await get().fetchUsers();

    const { currentUser } = get();
    if (currentUser?.id === id) {
      const refreshed = get().users.find((u) => u.id === id);
      if (refreshed) {
        set({ currentUser: refreshed });
      }
    }
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

    await getSessionAccessTokenOrThrow();

    const { data, error } = await withTimeout(
      supabase.functions.invoke<{
        ok?: boolean;
        error?: string;
      }>("delete-user", {
        body: { userId: id },
      }),
      45_000,
      "Tempo esgotado ao excluir utilizador no servidor. Confirme que a Edge Function «delete-user» está implantada.",
    );

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
