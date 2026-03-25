import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'user';
  createdAt: string;
}

const DEFAULT_USERS: User[] = [
  {
    id: 'master-admin',
    name: 'TI ServBrasil',
    email: 'ti@servbrasil.com.br',
    password: 'Br@sil500',
    role: 'admin',
    createdAt: new Date().toISOString()
  }
];

interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  users: User[];
  login: (email: string, pass: string) => boolean;
  logout: () => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
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
        
        const user = currentUsers.find(u => u.email === email && u.password === pass);
        if (user) {
          set({ isAuthenticated: true, currentUser: user, users: currentUsers });
          return true;
        }
        return false;
      },
      
      logout: () => set({ isAuthenticated: false, currentUser: null }),
      
      addUser: (user) => {
        const newUser: User = {
          ...user,
          id: Math.random().toString(36).substring(2, 9),
          createdAt: new Date().toISOString()
        };
        set({ users: [...get().users, newUser] });
      },
      
      updateUser: (id, updates) => {
        set({
          users: get().users.map(u => u.id === id ? { ...u, ...updates } : u),
          currentUser: get().currentUser?.id === id ? { ...get().currentUser!, ...updates } : get().currentUser
        });
      },
      
      deleteUser: (id) => {
        set({
          users: get().users.filter(u => u.id !== id)
        });
      }
    }),
    {
      name: 'flux-auth-store',
    }
  )
);
