import type { NextConfig } from "next";

/** Alamat API Go. Browser memanggil `/api/v1/...` di domain yang sama, lalu Next.js meneruskannya ke sini. */
const apiUrl = (process.env.API_URL ?? "http://localhost:8080").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Halaman di bawah (app) baru dirender setelah sesi (`GET /me`) dicek di browser, jadi validasi
    // instant navigation otomatis selalu gagal ("dropped segment"). Validasi hanya untuk segmen yang
    // mengekspor `instant` secara eksplisit.
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${apiUrl}/api/v1/:path*` }];
  },
  async redirects() {
    return [
      { source: "/", destination: "/projects", permanent: false },
      { source: "/projects/:slug", destination: "/projects/:slug/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
