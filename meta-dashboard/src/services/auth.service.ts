/**
 * Authentication API Service
 * Handles login redirection and user profile management
 */

import { apiClient } from './apiClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

export interface UserProfile {
    id: number;
    email: string;
    full_name?: string;
    profile_image?: string;
    facebook_id?: string;
    is_active: boolean;
}

/**
 * Get the Facebook Login URL from the backend
 * Now includes CSRF handling in the component, not here, but this fetches the base URL
 */
export function getFacebookLoginUrl(state: string): string {
    // We construct the URL directly to redirect the user
    // The backend endpoint is /api/v1/auth/facebook/login
    // We append the state parameter for CSRF protection
    return `${API_BASE_URL}/api/v1/auth/facebook/login?state=${state}`;
}

/**
 * Get the Google Login URL from the backend
 */
export function getGoogleLoginUrl(state: string): string {
    return `${API_BASE_URL}/api/v1/auth/google/login?state=${state}`;
}

/**
 * Login with Email and Password
 */
export async function loginWithEmail(data: any): Promise<{ access_token: string; token_type: string }> {
    const response = await apiClient.post('/api/v1/auth/login', data);
    return response.data;
}

/**
 * Fetch current user profile
 */
export async function fetchCurrentUser(): Promise<UserProfile> {
    try {
        const response = await apiClient.get<UserProfile>('/api/v1/users/me');
        return response.data;
    } catch (error) {
        // console.error('[Auth Service] Error fetching user profile:', error);
        throw error;
    }
}

/**
 * Logout
 */
export function logout() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/en/login';
    }
}
