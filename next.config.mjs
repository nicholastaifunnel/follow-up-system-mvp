/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep root tsconfig.json for CLI (`tsc` / `build`); Next uses this file only.
  typescript: {
    tsconfigPath: "./tsconfig.next.json",
  },
};

export default nextConfig;
