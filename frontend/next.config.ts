import type { NextConfig } from 'next';

/**
 * Replaces the old Vite dev-server proxy. When NEXT_PUBLIC_API_URL is not set,
 * the frontend talks to `/api` on its own origin and Next forwards those calls
 * to the Express backend.
 */
const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const nextConfig: NextConfig = {
  // Don't auto-generate AGENTS.md / CLAUDE.md into the repo.
  agentRules: false,
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/socket.io/:path*', destination: `${backendUrl}/socket.io/:path*` }
    ];
  }
};

export default nextConfig;
