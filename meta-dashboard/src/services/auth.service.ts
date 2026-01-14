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
 * Request a magic link for passwordless authentication
 * @param email User's email address
 */
export async function requestMagicLink(email: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/api/v1/auth/magic-link/request', { email });
    return response.data;
}

/**
 * Verify a magic link token and log in
 * @param token Magic link token from email
 */
export async function verifyMagicLink(token: string): Promise<{
    access_token: string;
    token_type: string;
    onboarding_status: any;
}> {
    const response = await apiClient.get(`/api/v1/auth/magic-link/verify?token=${token}`);
    return response.data;
}

/**
 * Get current user's onboarding status
 */
export async function getOnboardingStatus(): Promise<any> {
    const response = await apiClient.get('/api/v1/auth/onboarding/status');
    return response.data;
}

/**
 * Mark onboarding as complete (called after quiz)
 */
export async function completeOnboarding(): Promise<{ success: boolean }> {
    const response = await apiClient.post('/api/v1/auth/onboarding/complete');
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
        // Extract locale from current URL path (e.g., /he/dashboard -> he)
        const pathParts = window.location.pathname.split('/');
        const locale = pathParts[1] || 'en';
        window.location.href = `/${locale}/login`;
    }
}
