import axios from 'axios';

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

// Response Interceptor: Handle 401s
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
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
                                         '/pricing', '/homepage', '/homepage2', '/homepage3'];
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
