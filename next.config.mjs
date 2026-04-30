/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static page generation globally.
  // All pages will be rendered dynamically at request time.
  // This is required because all pages use Supabase auth which relies on
  // next/headers (cookies), which is not available at build time.
  output: undefined,
};

export default nextConfig;
