import { supabase } from '../lib/supabase';

const rawApiUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  // Get active session token from Supabase
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || localStorage.getItem('demo_token') || '';

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Set JSON content-type only if body is JSON string and not FormData
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return null as unknown as T;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data?.detail || 'An unexpected server error occurred';
      throw new Error(errorMsg);
    }

    return data as T;
  } catch (err: any) {
    if (err.message && err.message !== 'Failed to fetch') {
      throw err;
    }
    throw new Error('Could not reach the backend server. Please verify the backend is running on port 8000.');
  }
}
