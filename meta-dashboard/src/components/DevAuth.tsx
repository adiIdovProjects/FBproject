'use client';

import { useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * DevAuth Component
 * Automatically authenticates the user in development mode if no token is present.
 */
export default function DevAuth() {
    useEffect(() => {
        // Only run on client
        if (typeof window === 'undefined') return;

        const token = localStorage.getItem('token');
        if (!token) {
            console.log('[DevAuth] No token found, attempting auto-login...');

            axios.post(`${API_BASE_URL}/api/v1/auth/dev-login`)
                .then(response => {
                    const { access_token } = response.data;
                    if (access_token) {
                        localStorage.setItem('token', access_token);
                        console.log('[DevAuth] Successfully logged in as dev user. Reloading to apply token...');
                        window.location.reload();
                    }
                })
                .catch(error => {
                    console.error('[DevAuth] Auto-login failed:', error);
                });
        }
    }, []);

    return null;
}
