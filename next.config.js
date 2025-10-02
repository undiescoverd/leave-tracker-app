/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  reactStrictMode: true,
  poweredByHeader: false,
  generateEtags: true,
  compress: true,
  
  // Output configuration for production builds
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  outputFileTracingRoot: __dirname,
  
  // Performance optimizations
  onDemandEntries: {
    maxInactiveAge: process.env.NODE_ENV === 'production' ? 30 * 1000 : 60 * 1000,
    pagesBufferLength: process.env.NODE_ENV === 'production' ? 2 : 5,
  },

  // Security headers for production
  headers: async () => {
    if (process.env.NODE_ENV !== 'production') return [];
    
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      },
      {
        source: '/api/health',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          }
        ]
      },
      {
        source: '/api/metrics',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          }
        ]
      }
    ];
  },

  // Environment-specific experimental features
  experimental: {
    serverActions: {
      allowedOrigins: process.env.NODE_ENV === 'production' 
        ? [process.env.NEXTAUTH_URL?.replace(/https?:\/\//, '')] 
        : ['localhost:3000', 'localhost:3001', 'localhost:3002'],
    },
    // Instrumentation is now enabled by default in Next.js 15
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            // React and React DOM
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 40,
            },
            // UI libraries
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|class-variance-authority|clsx|tailwind-merge)[\\/]/,
              name: 'ui',
              chunks: 'all',
              priority: 30,
            },
            // React Query and data fetching
            dataFetching: {
              test: /[\\/]node_modules[\\/](@tanstack)[\\/]/,
              name: 'data-fetching',
              chunks: 'all',
              priority: 25,
            },
            // Next.js and NextAuth
            nextjs: {
              test: /[\\/]node_modules[\\/](next|next-auth)[\\/]/,
              name: 'nextjs',
              chunks: 'all',
              priority: 20,
            },
            // Other vendor libraries
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
          },
        },
        // Tree shaking optimization
        usedExports: true,
        sideEffects: false,
      };

      // Bundle analyzer in production builds (optional)
      if (process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: 'bundle-analysis.html',
          })
        );
      }
    }

    // Development error handling
    if (dev) {
      config.infrastructureLogging = {
        level: 'error',
      };
    }

    // Optimize for better tree shaking
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Ensure we get the ES modules version for better tree shaking
        'lodash': 'lodash-es',
      };
    }
    
    return config;
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    dangerouslyAllowSVG: false,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    domains: [],
    remotePatterns: [],
    unoptimized: false,
    loader: 'default',
    path: '/_next/image',
    quality: 85,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint configuration  
  eslint: {
    ignoreDuringBuilds: true, // Temporarily disabled due to ESLint v9 compatibility issues
  },
};

module.exports = nextConfig;
