import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

console.log('[API Client] Using base URL:', API_BASE_URL);

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach Token
apiClient.interceptors.request.use(
    (config) => {
        // We need to be careful about accessing localStorage on the server
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Handle 401s
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Check if this is a "Google not connected" error (not an auth failure)
            const isGoogleNotConnected = error.response.data?.detail?.includes('Google account not connected');

            if (!isGoogleNotConnected) {
                // Only redirect for actual authentication failures
                // Check if we are already on the login page to avoid loops
                if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                    // Clear invalid token
                    localStorage.removeItem('token');
                    // Redirect to login (or show login modal)
                    window.location.href = '/en/login';
                    console.warn('Unauthorized: Token expired or invalid');
                }
            }
        }
        return Promise.reject(error);
    }
);
