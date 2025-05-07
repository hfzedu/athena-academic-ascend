
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc"; // Using SWC for speed
import path from "path";
import { VitePWA } from "vite-plugin-pwa"; // For PWA capabilities
import { visualizer } from "rollup-plugin-visualizer"; // For bundle analysis
// import mkcert from 'vite-plugin-mkcert'; // For HTTPS in development (optional)
import { componentTagger } from "lovable-tagger"; // Your custom plugin

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env environment variables based on mode
  // This makes VITE_ variables available in process.env
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Base public path when served in production (e.g., if deployed to a subdirectory)
    // base: env.VITE_BASE_PATH || '/',

    server: {
      host: "::", // Listen on all available IPv6 and IPv4 addresses
      port: 8080, // Always use port 8080
      open: true, // Automatically open in browser on dev server start
      // https: mode === 'development' ? true : false, // Enable HTTPS for dev (requires mkcert plugin)
    },
    plugins: [
      react(),
      // Progressive Web App Configuration
      VitePWA({
        registerType: 'autoUpdate', // Or 'prompt' for user to update
        injectRegister: 'auto', // Or null or 'script'
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'], // Files to cache
          runtimeCaching: [ // Example runtime caching for API calls
            {
              urlPattern: ({ url }) => url.origin === env.VITE_SUPABASE_URL, // Cache Supabase API calls
              handler: 'NetworkFirst', // Or 'CacheFirst', 'StaleWhileRevalidate'
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                },
                cacheableResponse: {
                  statuses: [0, 200], // Cache opaque and successful responses
                },
              },
            },
            { // Cache Google Fonts
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 /* 1 year */ },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 /* 1 year */ },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        manifest: {
          // These values should match/complement your public/site.webmanifest
          // and index.html meta tags
          name: env.VITE_APP_NAME || 'Jamia Academia',
          short_name: env.VITE_APP_SHORT_NAME || 'JamiaAcad',
          description: env.VITE_APP_DESCRIPTION || 'Modern Academic Management Platform',
          theme_color: env.VITE_THEME_COLOR_LIGHT || '#ffffff', // Use your light theme primary/background
          background_color: env.VITE_BACKGROUND_COLOR || '#ffffff',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [ // Ensure these paths are correct relative to your public folder
            {
              src: 'pwa-192x192.png', // Create these icons
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'maskable-icon-512x512.png', // Important for better PWA experience
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: mode === 'development', // Enable PWA in dev for testing
          type: 'module',
        }
      }),
      // Bundle Visualizer - useful for inspecting bundle sizes
      // Only enable it when you explicitly want to analyze (e.g., via an env var)
      process.env.ANALYZE_BUNDLE && visualizer({
        open: true, // Automatically open in browser
        filename: 'dist/stats.html', // Output file
        gzipSize: true,
        brotliSize: true,
      }),
      // Your custom lovable-tagger plugin for development
      mode === 'development' && componentTagger(),
      // mkcert(), // Enable if you need HTTPS in development (e.g., for Secure PWA features)
    ].filter(Boolean), // Filter out falsy values (e.g., conditional plugins)

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    build: {
      outDir: 'dist', // Output directory
      sourcemap: mode === 'production' ? 'hidden' : true, // 'hidden' for prod, true for dev
      rollupOptions: {
        output: {
          // Manual Chunks for better code splitting and caching
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Group major vendor libraries into their own chunks
              if (id.includes('@tanstack/react-query')) return 'vendor-tanstack-query';
              if (id.includes('react-router-dom') || id.includes('@remix-run/router') || id.includes('react-router')) return 'vendor-react-router';
              if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
              if (id.includes('lucide-react')) return 'vendor-lucide';
              if (id.includes('@radix-ui')) return 'vendor-radix';
              if (id.includes('supabase')) return 'vendor-supabase';
              // Catch-all for other node_modules
              return 'vendor';
            }
          },
        },
      },
      target: 'esnext', // Or specify a list like ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14']
    },

    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.VITE_APP_NAME': JSON.stringify(env.VITE_APP_NAME || 'Jamia Academia'),
    },
  };
});
