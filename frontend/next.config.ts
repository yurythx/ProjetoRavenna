import type { NextConfig } from "next";

function tryParseRemotePatternFromEnv(): { protocol: "http" | "https"; hostname: string; port?: string; pathname: string } | null {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const protocol = u.protocol.replace(":", "");
    if (protocol !== "http" && protocol !== "https") return null;
    return {
      protocol,
      hostname: u.hostname,
      port: u.port || undefined,
      pathname: "/**",
    };
  } catch {
    return null;
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "127.0.0.1", port: "8000", pathname: "/**" },
      { protocol: "http", hostname: "localhost", port: "8000", pathname: "/**" },
    ],
  },
};

const envPattern = tryParseRemotePatternFromEnv();
if (envPattern) {
  const patterns = nextConfig.images?.remotePatterns ?? [];
  const exists = patterns.some(
    (p) =>
      p.protocol === envPattern.protocol &&
      p.hostname === envPattern.hostname &&
      (p.port ?? "") === (envPattern.port ?? "")
  );
  if (!exists) patterns.push(envPattern);
  if (nextConfig.images) nextConfig.images.remotePatterns = patterns;
}

export default nextConfig;
