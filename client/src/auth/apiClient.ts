/**
 * API Client with Microsoft Entra ID Authentication
 * 
 * ENTERPRISE-GRADE: All API calls use Entra ID tokens exclusively
 * 
 * This is the SINGLE API client for all backend requests.
 * No API call may bypass authentication.
 * 
 * Usage:
 * import { apiClient } from '@/auth/apiClient';
 * const data = await apiClient.get('/api/patients');
 * const result = await apiClient.post('/api/cases', caseData);
 */

import { msalInstance } from "./AuthProvider";
import { loginRequest } from "./authConfig";

/**
 * Get access token from Microsoft Entra ID via MSAL
 * 
 * This is the ONLY way to get a token.
 * No local tokens, no sessionStorage tokens, no fallbacks.
 * 
 * @returns Access token or null if not authenticated
 */
async function getAccessToken(): Promise<string | null> {
  try {
    const accounts = msalInstance.getAllAccounts();

    if (accounts.length === 0) {
      console.log("[API_CLIENT] No authenticated user - please sign in with Microsoft");
      return null;
    }

    const account = accounts[0];

    try {
      // Try silent token acquisition first (from cache or refresh)
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: account,
      });

      // Use ID token for backend authentication
      // The backend validates this against Microsoft Entra ID
      console.log("[API_CLIENT] ✅ Entra ID token acquired silently");
      return response.idToken;
    } catch (silentError) {
      console.warn("[API_CLIENT] Silent token acquisition failed, trying interactive...", silentError);

      try {
        // Fall back to interactive popup if silent fails
        const response = await msalInstance.acquireTokenPopup(loginRequest);
        console.log("[API_CLIENT] ✅ Entra ID token acquired via popup");
        return response.idToken;
      } catch (popupError) {
        console.error("[API_CLIENT] ❌ Failed to acquire token:", popupError);
        // Clear any stale auth state
        try {
          await msalInstance.logoutRedirect({ postLogoutRedirectUri: "/login" });
        } catch (logoutError) {
          // Ignore logout errors
        }
        return null;
      }
    }
  } catch (error) {
    console.error("[API_CLIENT] ❌ Error in getAccessToken:", error);
    return null;
  }
}

/**
 * API Client class with automatic Entra ID token attachment
 * 
 * Every request includes:
 * - Authorization: Bearer <Entra_ID_Token>
 * - Content-Type: application/json
 */
class APIClient {
  private baseURL: string;

  constructor(baseURL: string = "") {
    this.baseURL = baseURL;
  }

  /**
   * Make authenticated API request
   * 
   * @throws Error if not authenticated or request fails
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await getAccessToken();

    if (!token) {
      console.error("[API_CLIENT] ❌ No Entra ID token available");
      // Redirect to login
      window.location.href = "/login";
      throw new Error("Authentication required - please sign in with Microsoft");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers as Record<string, string> || {}),
    };

    console.log(`[API_CLIENT] Making request to: ${endpoint}`);

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle authentication errors
    if (response.status === 401) {
      console.error("[API_CLIENT] ❌ Authentication failed (401)");
      // Token may have expired - redirect to login
      window.location.href = "/login";
      throw new Error("Session expired - please sign in again");
    }

    if (response.status === 403) {
      console.error("[API_CLIENT] ❌ Access forbidden (403)");
      throw new Error("You don't have permission to access this resource");
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }));
      console.error("[API_CLIENT] ❌ Request failed:", error);
      throw new Error(error.message || error.error || "Request failed");
    }

    // Handle empty responses
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }

    return response.text() as unknown as T;
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "GET",
    });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: any,
    options: RequestInit = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: any,
    options: RequestInit = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: any,
    options: RequestInit = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "DELETE",
    });
  }

  /**
   * Upload file with multipart/form-data
   */
  async upload<T>(
    endpoint: string,
    formData: FormData,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await getAccessToken();

    if (!token) {
      window.location.href = "/login";
      throw new Error("Authentication required");
    }

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${token}`,
      ...(options.headers as Record<string, string> || {}),
    };

    // Don't set Content-Type for FormData - browser will set it with boundary
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      method: "POST",
      headers,
      body: formData,
    });

    if (response.status === 401) {
      window.location.href = "/login";
      throw new Error("Authentication required");
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new Error(error.message || "Upload failed");
    }

    return response.json();
  }
}

/**
 * Export singleton instance
 * Use this for all API calls throughout the application
 */
export const apiClient = new APIClient();

/**
 * Export getAccessToken for components that need direct token access
 * (e.g., WebSocket connections, third-party integrations)
 */
export { getAccessToken };
