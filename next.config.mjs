/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { domains: ["lh3.googleusercontent.com"] },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    config.externals.push({ "sql.js": "commonjs sql.js" });
    return config;
  },
};
export default nextConfig;
