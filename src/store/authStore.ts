import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { PermissionKey, normalizePermissions, hasUserPermission } from '@/lib/permissions';

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

interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  canAccess: (permission: PermissionKey) => boolean;
  fetchUsers: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  currentUser: null,
  users: [],
  isLoading: true,

  initialize: async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Erro ao buscar sessão no Supabase Auth:', sessionError);
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
          const user: User = {
            id: profile.id,
            name: profile.name || '',
            email: profile.email || session.user.email || '',
            profilePhoto: profile.profile_photo || '',
            role: profile.role as 'admin' | 'user',
            mustChangePassword: profile.must_change_password || false,
            permissions: (profile.permissions as PermissionKey[]) || [],
            createdAt: profile.created_at,
          };
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
      console.error('Erro crítico na inicialização do sistema:', err);
      set({ isAuthenticated: false, currentUser: null, isLoading: false });
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Erro ao carregar perfil após SIGNED_IN:', profileError.message, profileError);
          }

          if (profile) {
            const user: User = {
              id: profile.id,
              name: profile.name || '',
              email: profile.email || session.user.email || '',
              profilePhoto: profile.profile_photo || '',
              role: profile.role as 'admin' | 'user',
              mustChangePassword: profile.must_change_password || false,
              permissions: (profile.permissions as PermissionKey[]) || [],
              createdAt: profile.created_at,
            };
            set({ isAuthenticated: true, currentUser: user });
            if (user.role === 'admin') {
              get().fetchUsers();
            }
          }
        } else if (event === 'SIGNED_OUT') {
          set({ isAuthenticated: false, currentUser: null, users: [] });
        }
      } catch (err) {
        console.error('Erro no listener de autenticação:', err);
      }
    });
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
          const user: User = {
            id: profile.id,
            name: profile.name || '',
            email: profile.email || authUser.email || '',
            profilePhoto: profile.profile_photo || '',
            role: profile.role as 'admin' | 'user',
            mustChangePassword: profile.must_change_password || false,
            permissions: (profile.permissions as PermissionKey[]) || [],
            createdAt: profile.created_at,
          };
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

    const users: User[] = profiles.map((p) => ({
      id: p.id,
      name: p.name || '',
      email: p.email || '',
      profilePhoto: p.profile_photo || '',
      role: p.role as 'admin' | 'user',
      mustChangePassword: p.must_change_password || false,
      permissions: (p.permissions as PermissionKey[]) || [],
      createdAt: p.created_at,
    }));

    set({ users });
  },

  addUser: async (userData) => {
    // In Supabase, adding a user is usually done via Auth API
    // This would require a service role or a specific edge function if done from the client
    // For now, we'll assume the user is created via Supabase Auth and the trigger handles the profile
    console.warn('addUser should be implemented via Supabase Auth/Edge Functions');
  },

  updateUser: async (id, updates) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
        role: updates.role,
        permissions: updates.permissions,
        profile_photo: updates.profilePhoto,
        must_change_password: updates.mustChangePassword,
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }
    
    get().fetchUsers();
  },

  deleteUser: async (id) => {
    // Deleting a user requires management API access
    console.warn('deleteUser should be implemented via Supabase Management API/Edge Functions');
  },

  canAccess: (permission) => {
    const { currentUser } = get();
    if (!currentUser) return false;
    return hasUserPermission(currentUser.role, currentUser.permissions, permission);
  },
}));
