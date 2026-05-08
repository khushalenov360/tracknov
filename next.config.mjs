/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit the minimal Next.js server bundle used by Docker/Coolify.
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "64mb",
    },
  },
};

export default nextConfig;
