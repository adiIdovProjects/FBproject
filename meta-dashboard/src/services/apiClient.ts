import axios from 'axios';

// Helper to get CSRF token from cookie
function getCsrfToken(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    if (!match) return null;

    // Extract the plain token from signed cookie format: timestamp:token:signature
    const signedToken = decodeURIComponent(match[1]);
    const parts = signedToken.split(':');
    return parts.length === 3 ? parts[1] : null;
}

// API calls use relative URLs - Next.js rewrites proxy them to the backend
// This avoids cross-origin cookie issues in development
// In production, the rewrites point to the production backend URL
export const apiClient = axios.create({
    baseURL: '',  // Empty = relative URLs, proxied via Next.js rewrites
    headers: {
        'Content-Type': 'application/json',
    },
    // SECURITY: Include cookies in requests for HttpOnly auth token
    withCredentials: true,
    // Timeout after 30 seconds to prevent hanging requests
    timeout: 30000,
});

// Request Interceptor: Add CSRF token for state-changing requests
apiClient.interceptors.request.use(
    (config) => {
        // Add CSRF token for POST, PUT, PATCH, DELETE requests
        if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
            const csrfToken = getCsrfToken();
            if (csrfToken) {
                config.headers['X-CSRF-Token'] = csrfToken;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401s, 403s, and store CSRF token
apiClient.interceptors.response.use(
    (response) => {
        // Store CSRF token from response header if provided
        const csrfToken = response.headers['x-csrf-token'];
        if (csrfToken && typeof document !== 'undefined') {
            // Token is already in cookie, this header is for convenience
            // No action needed - browser already has the cookie
        }
        return response;
    },
    (error) => {
        // Handle CSRF validation failures
        if (error.response && error.response.status === 403) {
            const detail = error.response.data?.detail;
            if (detail === 'CSRF validation failed') {
                console.error('CSRF validation failed - try refreshing the page');
                // Optionally reload to get fresh CSRF token
                if (typeof window !== 'undefined') {
                    // Show user-friendly message before reload
                    alert('Security token expired. Please refresh the page.');
                    window.location.reload();
                }
            }
        }
        if (error.response && error.response.status === 401) {
            // Check if this is a "Google not connected" error (not an auth failure)
            const isGoogleNotConnected = error.response.data?.detail?.includes('Google account not connected');

            if (!isGoogleNotConnected) {
                // Only redirect for actual authentication failures
                // Skip redirect on public/onboarding pages
                if (typeof window !== 'undefined') {
                    const path = window.location.pathname;
                    // Check if it's a public page (no auth redirect)
                    const publicPaths = ['/login', '/callback', '/auth/verify', '/onboard',
                                         '/select-accounts', '/connect', '/privacy-policy', '/terms',
                                         '/pricing', '/homepage'];
                    const isPublicPage = publicPaths.some(p => path.includes(p)) ||
                                         path.match(/^\/[a-z]{2}\/?$/);
                    if (!isPublicPage) {
                        // Extract locale from current URL path (e.g., /he/dashboard -> he)
                        const pathParts = path.split('/');
                        const locale = pathParts[1] || 'en';
                        // Redirect to login preserving locale
                        window.location.href = `/${locale}/login`;
                    }
                }
            }
        }
        return Promise.reject(error);
    }
);
