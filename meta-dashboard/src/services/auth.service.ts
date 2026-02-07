/**
 * Authentication API Service
 * Handles login redirection and user profile management
 */

import { apiClient } from './apiClient';

// Support both env var names, with dev fallback
const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;
const isDev = process.env.NODE_ENV === 'development';
const API_BASE_URL = envUrl || (isDev ? 'http://localhost:8000' : '');

export interface UserProfile {
    id: number;
    email: string;
    full_name?: string;
    profile_image?: string;
    facebook_id?: string;
    timezone?: string;
    is_active: boolean;
}

/**
 * Get the browser's timezone
 */
export function getBrowserTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
        return 'UTC';
    }
}

/**
 * Update user's timezone on the server
 */
export async function updateTimezone(timezone: string): Promise<{ success: boolean }> {
    const response = await apiClient.patch('/api/v1/users/me/timezone', { timezone });
    return response.data;
}

/**
 * Sync browser timezone to server (call after login)
 */
export async function syncTimezone(): Promise<void> {
    try {
        const timezone = getBrowserTimezone();
        await updateTimezone(timezone);
    } catch (error) {
        // Silently fail - timezone sync is not critical
        console.warn('Failed to sync timezone:', error);
    }
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
 * Logout - clears the HttpOnly cookie via backend and redirects
 */
export async function logout() {
    if (typeof window !== 'undefined') {
        try {
            // Call backend to clear the HttpOnly cookie
            await apiClient.post('/api/v1/auth/logout');
        } catch (error) {
            // Ignore errors - proceed with redirect anyway
        }
        // Extract locale from current URL path (e.g., /he/dashboard -> he)
        const pathParts = window.location.pathname.split('/');
        const locale = pathParts[1] || 'en';
        window.location.href = `/${locale}/login`;
    }
}
