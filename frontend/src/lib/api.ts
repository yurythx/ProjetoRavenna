import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({ baseURL });

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

api.interceptors.request.use((config) => {
  const token = getTokenFromCookie();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    if (status === 403 && code === 'module_disabled') {
      const moduleName = error.response?.data?.module || 'unknown';
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('module-disabled', { detail: { module: moduleName } }));
      }
    }
    if (status === 401) {
      const original = error.config || {};
      if (!(original as any)._retry) {
        const refresh = getRefreshFromCookie();
        if (refresh) {
          (original as any)._retry = true;
          return api
            .post('/auth/token/refresh/', { refresh })
            .then((res) => {
              const access = res.data?.access;
              if (typeof document !== 'undefined' && access) {
                const d = new Date();
                d.setTime(d.getTime() + 7 * 24 * 60 * 60 * 1000);
                document.cookie = `auth_token=${encodeURIComponent(access)};expires=${d.toUTCString()};path=/`;
              }
              original.headers = original.headers || {};
              original.headers.Authorization = `Bearer ${access}`;
              return api.request(original);
            });
        }
      }
    }
    return Promise.reject(error);
  }
);
