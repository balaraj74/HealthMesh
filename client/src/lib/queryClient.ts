/**
 * React Query Client with Microsoft Entra ID Authentication
 * 
 * ENTERPRISE-GRADE: All API calls use Entra ID tokens exclusively
 * 
 * ❌ NO local tokens
 * ❌ NO sessionStorage tokens
 * ❌ NO email/password authentication
 * ✅ Microsoft Entra ID (MSAL) ONLY
 */

import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { msalInstance } from "@/auth/AuthProvider";
import { loginRequest } from "@/auth/authConfig";

/**
 * Get authentication token from Azure Entra ID (MSAL)
 * This is the ONLY authentication method
 * 
 * @returns ID token or null if not authenticated
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const accounts = msalInstance.getAllAccounts();

    if (accounts.length === 0) {
      console.log("[AUTH] No authenticated accounts found");
      return null;
    }

    // Get token silently from MSAL
    const response = await msalInstance.acquireTokenSilent({
      account: accounts[0],
      ...loginRequest,
    });

    // Return ID token for backend authentication
    // The backend validates this against Microsoft Entra ID
    return response.idToken;
  } catch (error) {
    console.error("[AUTH] Failed to acquire token silently:", error);

    // Try interactive if silent fails
    try {
      const response = await msalInstance.acquireTokenPopup(loginRequest);
      return response.idToken;
    } catch (popupError) {
      console.error("[AUTH] Failed to acquire token via popup:", popupError);
      return null;
    }
  }
}

/**
 * Build headers with Microsoft Entra ID authentication
 */
async function buildHeaders(includeContentType: boolean = false): Promise<HeadersInit> {
  const headers: Record<string, string> = {};

  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }

  const token = await getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    console.warn("[AUTH] No token available for API request");
  }

  return headers;
}

/**
 * Handle API response errors
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle authentication errors
    if (res.status === 401) {
      console.error("[AUTH] 401 Unauthorized - session expired or invalid");
      // Clear MSAL cache and redirect to login
      try {
        await msalInstance.clearCache();
      } catch (e) {
        // Ignore cache clear errors
      }
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
      throw new Error("Authentication required - please sign in with Microsoft");
    }

    if (res.status === 403) {
      throw new Error("Access denied - you don't have permission to access this resource");
    }

    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Make authenticated API request
 * All requests automatically include Entra ID token
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers = await buildHeaders(!!data);

  // Ensure we have authentication before making request
  const authHeader = (headers as Record<string, string>)["Authorization"];
  if (!authHeader && !url.includes("/api/health") && !url.includes("/api/config")) {
    console.error("[AUTH] Attempting API request without authentication");
    window.location.href = "/login";
    throw new Error("Authentication required");
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Query function factory for React Query
 */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const res = await fetch(queryKey.join("/") as string, {
        headers: await buildHeaders(false),
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

/**
 * React Query client instance
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
