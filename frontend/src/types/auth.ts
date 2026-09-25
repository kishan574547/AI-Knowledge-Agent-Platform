export interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    [key: string]: any;
  };
}

export interface AuthSession {
  access_token: string;
  user: User;
}

export interface UserProfile {
  id: string;
  user_id: string;
  email?: string;
  full_name?: string;
  created_at: string;
  updated_at: string;
}
