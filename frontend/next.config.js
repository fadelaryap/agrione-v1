/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable standalone output for Docker
  experimental: {
    // Disable server minification to avoid AbortSignal issues with @google-cloud/storage
    // See: https://github.com/vercel/next.js/issues/55682
    serverMinification: false,
  },
}

module.exports = nextConfig

