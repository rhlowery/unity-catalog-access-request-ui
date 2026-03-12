import axios from 'axios';
import { toast } from 'sonner';
import { SessionManager } from '@/services/session/SessionManager';

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_BFF_URL || 'http://localhost:3001',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(async (config) => {
    config.headers['X-Correlation-ID'] = crypto.randomUUID();

    // Inject identity headers from active session
    try {
        const session = await SessionManager.getActiveSession();
        if (session) {
            config.headers['X-User-Id'] = session.userId;
            config.headers['X-User-Groups'] = (session.userGroups || []).join(',');
        }
    } catch (e) {
        console.warn('[apiClient] Failed to fetch session for headers', e);
    }

    // Inject CSRF token from cookie
    if (config.method !== 'get' && config.method !== 'head') {
        const csrfToken = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrf_token='))
            ?.split('=')[1];
        if (csrfToken) {
            config.headers['X-CSRF-Token'] = csrfToken;
        } else {
            console.warn('[apiClient] CSRF token not found in cookies for state-changing request');
        }
    }

    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.error || 'An unexpected error occurred';

            if (status === 401) {
                toast.error('Session Expired', {
                    description: 'Your session has expired. Please log in again.',
                    duration: Infinity,
                });

                const session = await SessionManager.getActiveSession();
                if (session) {
                    await SessionManager.destroySession(session.id);
                }

                window.dispatchEvent(new CustomEvent('sessionExpired', {
                    detail: { message: 'Session invalid' }
                }));
            } else {
                // Show generic error for 403, 400, 404, 500 etc
                toast.error(status >= 500 ? 'Server Error' : (status === 403 ? 'Access Denied' : 'Request Failed'), {
                    description: message,
                    duration: Infinity,
                });
            }
        } else if (error.request) {
            toast.error('Network Error', {
                description: 'Failed to contact the server. Please check your connection.',
                duration: Infinity,
            });
        }

        return Promise.reject(error);
    }
);
