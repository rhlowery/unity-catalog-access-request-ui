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

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.error || 'An unexpected error occurred';

            if (status === 401 || status === 403) {
                toast.error('Authentication Error', {
                    description: 'Your session has expired or is invalid. Please log in again.',
                });

                const session = await SessionManager.getActiveSession();
                if (session) {
                    await SessionManager.destroySession(session.id);
                }

                window.dispatchEvent(new CustomEvent('sessionExpired', {
                    detail: { message: 'Session invalid' }
                }));
            } else if (status >= 500) {
                toast.error('Server Error', {
                    description: message,
                });
            }
        } else if (error.request) {
            toast.error('Network Error', {
                description: 'Failed to contact the server. Please check your connection.',
            });
        }

        return Promise.reject(error);
    }
);
