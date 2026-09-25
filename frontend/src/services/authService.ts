import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { apiRequest } from './api';
import { UserProfile } from '../types/auth';

export const authService = {
  async register(email: string, password: string, fullName?: string) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) throw error;
      return data;
    } else {
      // Fallback to backend mock auth endpoint
      return await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
    }
  },

  async verifySignupOtp(email: string, token: string) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });
      if (error) throw error;
      return data;
    } else {
      throw new Error('Supabase is not configured for OTP verification.');
    }
  },

  async resendSignupOtp(email: string) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
      return data;
    } else {
      throw new Error('Supabase is not configured for resending OTP.');
    }
  },

  async login(email: string, password: string) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } else {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (res.access_token) {
        localStorage.setItem('demo_token', res.access_token);
        localStorage.setItem('demo_user', JSON.stringify(res.user));
      }
      return res;
    }
  },

  async logout() {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('demo_token');
    localStorage.removeItem('demo_user');
  },

  async getCurrentProfile(): Promise<UserProfile> {
    return await apiRequest<UserProfile>('/users/me');
  },

  async sendPasswordResetOtp(email: string) {
    if (isSupabaseConfigured) {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/forgot-password` : undefined;
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      return data;
    } else {
      throw new Error('Supabase is not configured for email recovery.');
    }
  },

  async verifyPasswordResetOtp(email: string, token: string) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
      });
      if (error) throw error;
      return data;
    } else {
      throw new Error('Supabase is not configured for OTP verification.');
    }
  },

  async updatePassword(password: string) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.updateUser({
        password,
      });
      if (error) throw error;
      return data;
    } else {
      throw new Error('Supabase is not configured for password updates.');
    }
  },
};
