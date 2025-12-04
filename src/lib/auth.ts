// Authentication service for admin operations

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://api.himalayanguardian.com";

const AUTH_API = `${API_BASE_URL}/api/auth`;
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isVerified?: boolean;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  data?: {
    accessToken: string;
    tokenType: string;
    user: User;
  };
  timestamp?: string;
}

/**
 * Login with email and password
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  try {
    const response = await fetch(`${AUTH_API}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || "Login failed",
      };
    }

    // Store token and user info
    if (data.success && data.data?.accessToken) {
      localStorage.setItem(TOKEN_KEY, data.data.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));

      return {
        success: true,
        data: data.data,
      };
    }

    return {
      success: false,
      message: data.message || "Login failed - no token received",
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Login failed",
    };
  }
}

/**
 * Logout - clear stored credentials
 */
export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Get the stored auth token
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get the stored user info
 */
export function getUser(): User | null {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

/**
 * Check if user has admin role
 */
export function isAdmin(): boolean {
  const user = getUser();
  return user?.role === "ADMIN" || user?.role === "admin";
}

/**
 * Get authorization headers for API requests
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}
