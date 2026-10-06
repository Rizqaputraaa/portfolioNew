/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Short share links for the client workspace: /w/padel -> /workspace/padel, /w/padel/3 -> opens feed 3.
  async redirects() {
    return [
      { source: '/w/:slug', destination: '/workspace/:slug', permanent: false },
      { source: '/w/:slug/:feed(\\d+)', destination: '/workspace/:slug?feed=:feed', permanent: false },
    ];
  },
};

export default nextConfig;