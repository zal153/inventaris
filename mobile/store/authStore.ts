import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import axios from "axios";

export const API_URL = "https://inventaris-tan.vercel.app/api/mobile";

export interface User {
  userId: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,
  login: async (token, user) => {
    try {
      await SecureStore.setItemAsync("user-token", token);
      await SecureStore.setItemAsync("user-data", JSON.stringify(user));
      set({ token, user });
    } catch (e) {
      console.error("Gagal menyimpan sesi auth:", e);
      throw e;
    }
  },
  logout: async () => {
    try {
      await SecureStore.deleteItemAsync("user-token");
      await SecureStore.deleteItemAsync("user-data");
      set({ token: null, user: null });
    } catch (e) {
      console.error("Gagal menghapus sesi auth:", e);
    }
  },
  initialize: async () => {
    try {
      const storedToken = await SecureStore.getItemAsync("user-token");
      const storedUser = await SecureStore.getItemAsync("user-data");

      if (storedToken && storedUser) {
        set({ token: storedToken, user: JSON.parse(storedUser) });
      }
    } catch (e) {
      console.error("Gagal memuat sesi auth:", e);
    } finally {
      set({ isLoading: false });
    }
  },
}));

// Setup Axios Interceptors using Zustand's synchronous getState()
axios.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.log("[AuthStore] Sesi kadaluarsa (401), mengeluarkan user...");
      await useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
