import React, { createContext, useState, useEffect, useContext } from "react";
import * as SecureStore from "expo-secure-store";
import axios from "axios";

// URL base Next.js Vercel API
export const API_URL = "https://inventaris-tan.vercel.app/api/mobile";

interface AuthContextType {
  token: string | null;
  user: {
    userId: string;
    email: string;
    name: string;
    role: string;
  } | null;
  isLoading: boolean;
  login: (token: string, user: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Periksa sesi tersimpan saat aplikasi dimuat
  useEffect(() => {
    async function loadStorageData() {
      try {
        const storedToken = await SecureStore.getItemAsync("user-token");
        const storedUser = await SecureStore.getItemAsync("user-data");

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Konfigurasi axios default header
          axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
        }
      } catch (e) {
        console.error("Gagal memuat sesi auth:", e);
      } finally {
        setIsLoading(false);
      }
    }

    loadStorageData();
  }, []);

  const login = async (newToken: string, userData: any) => {
    try {
      await SecureStore.setItemAsync("user-token", newToken);
      await SecureStore.setItemAsync("user-data", JSON.stringify(userData));
      
      setToken(newToken);
      setUser(userData);
      
      axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    } catch (e) {
      console.error("Gagal menyimpan sesi auth:", e);
      throw e;
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync("user-token");
      await SecureStore.deleteItemAsync("user-data");
      
      setToken(null);
      setUser(null);
      
      delete axios.defaults.headers.common["Authorization"];
    } catch (e) {
      console.error("Gagal menghapus sesi auth:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }
  return context;
}
