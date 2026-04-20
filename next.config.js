/** @type {import('next').NextConfig} */
const nextConfig = {
  sassOptions: {
    includePaths: ["node_modules"],
  },
  // Prevent webpack from bundling these server-only packages
  serverExternalPackages: ["pdf-parse", "tesseract.js"],
};

module.exports = nextConfig;
