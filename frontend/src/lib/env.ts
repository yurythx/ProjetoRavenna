export function getApiBaseUrl() {
  // Use internal Docker network for server-side requests
  if (typeof window === "undefined") {
    return "http://backend:8000";
  }

  let url = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url || url.includes("yourdomain.com")) {
    url = "https://projetoravenna.cloud";
  }

  // Remove trailing slashes AND trailing /api if present to avoid duplication
  return url.replace(/\/+$/, "").replace(/\/api$/, "");
}

export function getSiteBaseUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (url) return url.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`.replace(/\/+$/, "");

  return "http://localhost:3000";
}

export function isProd() {
  return process.env.NODE_ENV === "production";
}
