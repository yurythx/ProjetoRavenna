import axios from 'axios';

const isServer = typeof window === 'undefined';
const baseURL = isServer
  ? (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1')
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1');

export const api = axios.create({
  baseURL,
  timeout: 30000, // 30 seconds - CRITICAL for mobile connections
  withCredentials: true, // Send cookies with CORS requests
  headers: {
    'Content-Type': 'application/json',
  },
});

function getTokenFromCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getRefreshFromCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )refresh_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = getTokenFromCookie();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor - handle errors and retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const originalRequest = error.config || {};

    // Log error for debugging
    if (!isServer && process.env.NODE_ENV === 'development') {
      console.error('[API Error]', {
        url: originalRequest.url,
        method: originalRequest.method,
        status,
        message: error.message,
        code: error.code,
      });
    }

    // Handle module disabled (403)
    if (status === 403 && code === 'module_disabled') {
      const moduleName = error.response?.data?.module || 'unknown';
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('module-disabled', { detail: { module: moduleName } }));
      }
    }

    // Handle timeout and network errors - RETRY ONCE
    if (
      (error.code === 'ECONNABORTED' || error.message.includes('timeout') || error.message.includes('Network Error')) &&
      !(originalRequest as any)._retryNetwork
    ) {
      (originalRequest as any)._retryNetwork = true;

      // Wait 2 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.warn('[API] Retrying request after network error:', originalRequest.url);
      return api.request(originalRequest);
    }

    // Handle unauthorized (401) - refresh token
    if (status === 401 && !(originalRequest as any)._retryAuth) {
      const refresh = getRefreshFromCookie();
      if (refresh) {
        (originalRequest as any)._retryAuth = true;

        try {
          const res = await api.post('/auth/token/refresh/', { refresh });
          const access = res.data?.access;

          if (typeof document !== 'undefined' && access) {
            const d = new Date();
            d.setTime(d.getTime() + 7 * 24 * 60 * 60 * 1000);
            document.cookie = `auth_token=${encodeURIComponent(access)};expires=${d.toUTCString()};path=/`;
          }

          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api.request(originalRequest);
        } catch (refreshError) {
          // Refresh failed - redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
        }
      }
    }

    return Promise.reject(error);
  }
);
