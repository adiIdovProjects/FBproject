import axios from 'axios';

// CSRF token stored in memory (more secure than non-HttpOnly cookie)
let csrfToken: string | null = null;

// Get stored CSRF token
function getCsrfToken(): string | null {
    return csrfToken;
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
        // Store CSRF token from response header in memory
        const newCsrfToken = response.headers['x-csrf-token'];
        if (newCsrfToken) {
            csrfToken = newCsrfToken;
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
                                         '/pricing'];
                    const isPublicPage = publicPaths.some(p => path.includes(p)) ||
                                         path.match(/^\/[a-z]{2}\/?$/);
                    if (!isPublicPage) {
                        // Extract locale from current URL path (e.g., /he/dashboard -> he)
                        const pathParts = path.split('/');
                        const locale = pathParts[1] || 'en';
                        const loginPath = `/${locale}/login`;
                        // Prevent redirect loop - only redirect if not already going to login
                        if (path !== loginPath && !path.endsWith('/login')) {
                            window.location.href = loginPath;
                        }
                    }
                }
            }
        }
        return Promise.reject(error);
    }
);
