/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force development server settings
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
  
  // Ensure consistent behavior
  reactStrictMode: true,
  
  // Help with 500 errors - show more detailed errors in development
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 60 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 5,
  },

  // Experimental features that might help with stability
  experimental: {
    // Helps with hot reload issues
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },

  // Add custom webpack config to help with module resolution
  webpack: (config, { dev, isServer }) => {
    // In development, add better error handling
    if (dev) {
      config.infrastructureLogging = {
        level: 'error',
      };
    }
    return config;
  },
};

module.exports = nextConfig;
