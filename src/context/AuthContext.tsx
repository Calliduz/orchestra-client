import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_V1_URL } from '../config/api.js';

export interface AuthUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'FACULTY' | 'STUDENT';
  firstName: string;
  lastName: string;
  studentId?: string | null;
  rfidUid?: string | null;
  department?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isFaculty: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('orchestra_jwt_token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const cached = localStorage.getItem('orchestra_auth_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_V1_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setUser(json.data);
            localStorage.setItem('orchestra_auth_user', JSON.stringify(json.data));
          } else {
            logout();
          }
        } else {
          logout();
        }
      } catch (err) {
        console.error('Failed to verify session token:', err);
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const login = (newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('orchestra_jwt_token', newToken);
    localStorage.setItem('orchestra_auth_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('orchestra_jwt_token');
    localStorage.removeItem('orchestra_auth_user');
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'ADMIN';
  const isFaculty = user?.role === 'FACULTY' || user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        isAdmin,
        isFaculty,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

