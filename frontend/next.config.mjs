/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure layout pages render correctly on very small screens and in edge cases
  pageExtensions: ["ts", "tsx", "js", "jsx"],
};

export default nextConfig;
