/**
 * CSRF Protection Utility
 * Handles generation and verification of state parameters for OAuth flows
 */

const STATE_STORAGE_KEY = 'oauth_state';

/**
 * Generate a cryptographically secure random string
 */
export function generateState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const state = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');

    // Store in session storage (cleared when browser closes)
    if (typeof window !== 'undefined') {
        sessionStorage.setItem(STATE_STORAGE_KEY, state);
    }

    return state;
}

/**
 * Verify if the returned state matches the stored state
 */
export function verifyState(returnedState: string | null): boolean {
    if (typeof window === 'undefined' || !returnedState) return false;

    const storedState = sessionStorage.getItem(STATE_STORAGE_KEY);

    // Clear state after verification attempt to prevent replay
    sessionStorage.removeItem(STATE_STORAGE_KEY);

    return storedState === returnedState;
}

/**
 * Get the current stored state (for debugging)
 */
export function getStoredState(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(STATE_STORAGE_KEY);
}
