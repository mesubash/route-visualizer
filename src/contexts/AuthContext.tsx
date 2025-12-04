import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from "react";
import { login as authLogin, logout as authLogout, getUser, isAuthenticated, isAdmin, User, LoginRequest } from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isAdminUser: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  showLoginDialog: boolean;
  setShowLoginDialog: (show: boolean) => void;
  openLoginDialog: () => void;
  handleLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // Compute auth state based on user
  const isLoggedIn = useMemo(() => {
    return user !== null && isAuthenticated();
  }, [user]);

  const isAdminUser = useMemo(() => {
    return user !== null && isAdmin();
  }, [user]);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedUser = getUser();
    if (storedUser && isAuthenticated()) {
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authLogin(credentials);
      if (response.success && response.data) {
        setUser(response.data.user);
        setShowLoginDialog(false);
        return { success: true };
      }
      return { success: false, message: response.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setUser(null);
  }, []);

  const openLoginDialog = useCallback(() => {
    console.log("Opening login dialog");
    setShowLoginDialog(true);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const value: AuthContextType = {
    user,
    isLoggedIn,
    isAdminUser,
    isLoading,
    login,
    logout,
    showLoginDialog,
    setShowLoginDialog,
    openLoginDialog,
    handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
