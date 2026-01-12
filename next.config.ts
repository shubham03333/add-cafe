
import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
  "eslint": { "ignoreDuringBuilds": true },



  // Memory optimizations for development
  webpack: (config, { dev }) => {
    if (dev) {
      // Reduce memory usage in development
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
          },
        },
      };

      // Add memory limit for webpack
      config.performance = {
        ...config.performance,
        maxAssetSize: 1000000, // 1MB
        maxEntrypointSize: 1000000, // 1MB
      };
    }

    return config;
  },
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: true, // Temporarily disable PWA to fix build
})(nextConfig as any);
