import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PermissionKey, normalizePermissions, hasUserPermission } from '@/lib/permissions';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  profilePhoto?: string;
  role: 'admin' | 'user';
  mustChangePassword: boolean;
  permissions: PermissionKey[];
  createdAt: string;
}

const DEFAULT_USERS: User[] = [
  {
    id: 'master-admin',
    name: 'TI ServBrasil',
    email: 'ti@servbrasil.com.br',
    password: 'Br@sil500',
    profilePhoto: '',
    role: 'admin',
    mustChangePassword: false,
    permissions: normalizePermissions('admin'),
    createdAt: new Date().toISOString()
  }
];

const MASTER_EMAIL = 'ti@servbrasil.com.br';

const grantMasterAccess = (user: User): User => {
  if (user.email.trim().toLowerCase() !== MASTER_EMAIL) return user;
  return {
    ...user,
    role: 'admin',
    mustChangePassword: false,
    permissions: normalizePermissions('admin'),
  };
};

interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  users: User[];
  login: (email: string, pass: string) => boolean;
  logout: () => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  changeOwnPassword: (currentPassword: string, newPassword: string) => { success: boolean; message: string };
  updateOwnProfile: (updates: { name: string; email: string; profilePhoto?: string }) => { success: boolean; message: string };
  canAccess: (permission: PermissionKey) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      currentUser: null,
      users: DEFAULT_USERS,
      
      login: (email, pass) => {
        const { users } = get();
        const currentUsers = users && users.length > 0 ? users : DEFAULT_USERS;
        const normalizedUsers = currentUsers.map((u) => grantMasterAccess({
          ...u,
          permissions: normalizePermissions(u.role, u.permissions),
        }));
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedPass = pass.trim();

        const user = normalizedUsers.find(
          (u) => u.email.trim().toLowerCase() === normalizedEmail && u.password?.trim() === normalizedPass
        );
        if (user) {
          set({ isAuthenticated: true, currentUser: user, users: normalizedUsers });
          return true;
        }
        return false;
      },
      
      logout: () => set({ isAuthenticated: false, currentUser: null }),
      
      addUser: (user) => {
        const newUser: User = grantMasterAccess({
          ...user,
          name: user.name.trim(),
          email: user.email.trim().toLowerCase(),
          password: user.password.trim(),
          permissions: normalizePermissions(user.role, user.permissions),
          id: Math.random().toString(36).substring(2, 9),
          createdAt: new Date().toISOString()
        });
        set({ users: [...get().users, newUser] });
      },
      
      updateUser: (id, updates) => {
        const normalizedUpdates: Partial<User> = {
          ...updates,
          ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
          ...(updates.email !== undefined ? { email: updates.email.trim().toLowerCase() } : {}),
          ...(updates.password !== undefined ? { password: updates.password.trim() } : {}),
          ...(updates.role !== undefined || updates.permissions !== undefined
            ? {
                permissions: normalizePermissions(
                  (updates.role as 'admin' | 'user') || get().users.find((u) => u.id === id)?.role || 'user',
                  (updates.permissions as PermissionKey[] | undefined) ||
                    get().users.find((u) => u.id === id)?.permissions
                ),
              }
            : {}),
        };

        set({
          users: get().users.map(u => u.id === id ? grantMasterAccess({ ...u, ...normalizedUpdates }) : u),
          currentUser: get().currentUser?.id === id ? grantMasterAccess({ ...get().currentUser!, ...normalizedUpdates }) : get().currentUser
        });
      },
      
      deleteUser: (id) => {
        set({
          users: get().users.filter(u => u.id !== id)
        });
      },

      changeOwnPassword: (currentPassword, newPassword) => {
        const { currentUser, users } = get();
        if (!currentUser) {
          return { success: false, message: 'Usuário não autenticado.' };
        }

        const dbUser = users.find((u) => u.id === currentUser.id);
        if (!dbUser || dbUser.password !== currentPassword) {
          return { success: false, message: 'Senha atual inválida.' };
        }

        if (newPassword.length < 6) {
          return { success: false, message: 'A nova senha deve ter pelo menos 6 caracteres.' };
        }

        const updatedUser = { ...dbUser, password: newPassword, mustChangePassword: false };
        set({
          users: users.map((u) => (u.id === dbUser.id ? updatedUser : u)),
          currentUser: updatedUser,
        });

        return { success: true, message: 'Senha alterada com sucesso.' };
      },

      updateOwnProfile: ({ name, email, profilePhoto }) => {
        const { currentUser, users } = get();
        if (!currentUser) {
          return { success: false, message: 'Usuário não autenticado.' };
        }

        const normalizedEmail = email.trim().toLowerCase();
        const emailTaken = users.some((u) => u.id !== currentUser.id && u.email === normalizedEmail);
        if (emailTaken) {
          return { success: false, message: 'Este e-mail já está em uso por outro usuário.' };
        }

        const updatedUser = grantMasterAccess({
          ...currentUser,
          name: name.trim(),
          email: normalizedEmail,
          ...(profilePhoto !== undefined ? { profilePhoto } : {}),
        });

        set({
          users: users.map((u) => (u.id === currentUser.id ? updatedUser : u)),
          currentUser: updatedUser,
        });

        return { success: true, message: 'Perfil atualizado com sucesso.' };
      },

      canAccess: (permission) => {
        const { currentUser } = get();
        if (!currentUser) return false;
        return hasUserPermission(currentUser.role, currentUser.permissions, permission);
      },
    }),
    {
      name: 'flux-auth-store',
      version: 1,
      migrate: (persistedState: any) => {
        const rawState = persistedState?.state ?? persistedState;
        if (!rawState) return persistedState;

        const migratedUsers = (rawState.users || DEFAULT_USERS).map((u: User) => grantMasterAccess({
          ...u,
          permissions: normalizePermissions(u.role, u.permissions),
          mustChangePassword: u.mustChangePassword ?? false,
          profilePhoto: u.profilePhoto ?? '',
        }));

        const currentUser = rawState.currentUser
          ? {
              ...rawState.currentUser,
              permissions: normalizePermissions(
                rawState.currentUser.role,
                rawState.currentUser.permissions
              ),
              mustChangePassword: rawState.currentUser.mustChangePassword ?? false,
              profilePhoto: rawState.currentUser.profilePhoto ?? '',
            }
          : null;

        if (persistedState?.state) {
          return {
            ...persistedState,
            state: {
              ...rawState,
              users: migratedUsers,
              currentUser,
            },
          };
        }

        return {
          ...rawState,
          users: migratedUsers,
          currentUser,
        };
      },
    }
  )
);
