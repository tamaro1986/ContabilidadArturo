import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/supabase-api/:path*',
        // Enmascara las peticiones a Supabase pasándolas por el servidor de Vercel
        destination: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
