import { getApiBaseUrl } from "./env";
import Axios from "axios";

export const api = Axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

// Intelligent URL Normalization Interceptor
api.interceptors.request.use((config) => {
  if (config.url) {
    let url = config.url;

    // 1. Clean up duplicate prefixes if they were passed in
    url = url.replace(/^(\/)?api\/v1\/api\//, "/");
    url = url.replace(/^(\/)?api\/api\//, "/");
    url = url.replace(/^(\/)?api\/v1\//, "/");
    url = url.replace(/^(\/)?api\//, "/");

    // 2. Map 'articles' path used in frontend to 'blog' used in backend
    url = url.replace(/^\/articles\//, "/blog/");
    url = url.replace(/^\/v1\/articles\//, "/blog/");

    // 3. Prepend canonical /api/v1/ prefix
    url = `/api/v1${url.startsWith("/") ? "" : "/"}${url}`;

    // 4. Ensure trailing slash before query params (Django requirement)
    const [base, query] = url.split("?");
    let finalBase = base;
    if (!finalBase.endsWith("/") && !finalBase.split("/").pop()?.includes(".")) {
      finalBase += "/";
    }
    config.url = query ? `${finalBase}?${query}` : finalBase;
  }
  return config;
});
