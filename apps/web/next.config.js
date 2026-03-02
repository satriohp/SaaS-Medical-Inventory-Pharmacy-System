/** @type {import('next').NextConfig} */
const nextConfig = {
    // Backend API URL for server-side requests
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
        NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
    },
    // Proxy API calls to avoid CORS in development (optional)
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;
