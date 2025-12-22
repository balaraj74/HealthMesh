/**
 * User Context Hook
 * 
 * Fetches authenticated user profile from backend /api/me endpoint
 * 
 * WHY:
 * - Frontend should NOT store identity locally
 * - User context comes from verified Entra token
 * - Hospital ID comes from backend, not frontend
 * 
 * USAGE:
 * const { user, isLoading } = useUser();
 * if (user) {
 *   console.log(user.name, user.hospitalId);
 * }
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./apiClient";
import { useIsAuthenticated } from "@azure/msal-react";

export interface User {
    id: string;
    email: string;
    name: string;
    role: "admin" | "doctor" | "nurse";
    hospitalId: string;
}

interface MeResponse {
    success: boolean;
    data: User;
}

/**
 * Hook to get the current authenticated user
 * Returns user profile fetched from /api/me endpoint
 */
export function useUser() {
    const isAuthenticated = useIsAuthenticated();

    const { data, isLoading, error, refetch } = useQuery<MeResponse>({
        queryKey: ["/api/me"],
        queryFn: async () => {
            return await apiClient.get<MeResponse>("/api/me");
        },
        enabled: isAuthenticated,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
    });

    return {
        user: data?.data || null,
        isLoading: isAuthenticated && isLoading,
        error: error as Error | null,
        refetch,
    };
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(requiredRole: "admin" | "doctor" | "nurse") {
    const { user, isLoading } = useUser();

    if (isLoading || !user) {
        return { hasRole: false, isLoading };
    }

    const roleHierarchy = { admin: 3, doctor: 2, nurse: 1 };
    const hasRole = roleHierarchy[user.role] >= roleHierarchy[requiredRole];

    return { hasRole, isLoading: false };
}

/**
 * Hook to get the current user's hospital ID
 * For use in components that need to know the hospital context
 */
export function useHospitalId() {
    const { user, isLoading } = useUser();
    return {
        hospitalId: user?.hospitalId || null,
        isLoading,
    };
}
