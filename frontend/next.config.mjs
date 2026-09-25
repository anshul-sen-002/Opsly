/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure layout pages render correctly on very small screens and in edge cases
  pageExtensions: ["ts", "tsx", "js", "jsx"],
  async rewrites() {
    // Same-origin API proxy: the browser talks only to the Vercel domain, so
    // the refresh cookie is first-party (no third-party blocking by browsers).
    // Local dev is untouched — NEXT_PUBLIC_API_URL points at localhost:8080.
    const backend = (process.env.BACKEND_URL ?? "https://opsly-jm8v.onrender.com").replace(/\/+$/, "");
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
