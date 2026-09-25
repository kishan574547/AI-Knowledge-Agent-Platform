import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { authService } from '../services/authService';
import { User } from '../types/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSupabaseConfigured) {
      // Listen to Supabase auth state changes
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ? {
          id: session.user.id,
          email: session.user.email,
          user_metadata: session.user.user_metadata,
        } : null);
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ? {
          id: session.user.id,
          email: session.user.email,
          user_metadata: session.user.user_metadata,
        } : null);
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      // Local demo mode fallback
      const stored = localStorage.getItem('demo_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await authService.login(email, pass);
      if (!isSupabaseConfigured && res.user) {
        setUser(res.user);
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, pass: string, name?: string) => {
    setLoading(true);
    try {
      const res = await authService.register(email, pass, name);
      if (!isSupabaseConfigured && res.user) {
        setUser(res.user);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
