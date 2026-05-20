import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Explicitly inject VITE_ env vars so they're always baked into the bundle
    define: {
      'import.meta.env.VITE_SUPABASE_URL':    JSON.stringify(process.env.VITE_SUPABASE_URL    ?? ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY ?? ''),
      'import.meta.env.VITE_FAMILY_ID':       JSON.stringify(process.env.VITE_FAMILY_ID       ?? ''),
      'import.meta.env.VITE_VAPID_PUBLIC_KEY': JSON.stringify(process.env.VITE_VAPID_PUBLIC_KEY ?? ''),
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
