/** @type {import('next').NextConfig} */
const blobHost = 'https://*.public.blob.vercel-storage.com';
const csp = (frameAncestors) => [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:${process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline' https://api.fontshare.com",
  "font-src 'self' https://cdn.fontshare.com data:",
  `img-src 'self' data: blob: ${blobHost}`,
  "media-src 'self' blob: data:",
  `connect-src 'self' blob: data: ${blobHost} https://storage.googleapis.com https://www.gstatic.com https://vercel.com https://*.vercel-storage.com`,
  "worker-src 'self' blob:",
  `frame-ancestors ${frameAncestors}`,
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const security = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

export default {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['@gltf-transform/core', '@gltf-transform/functions', '@gltf-transform/extensions', 'meshoptimizer'],
  async headers() {
    return [
      { source: '/((?!embed/).*)', headers: [...security, { key: 'Content-Security-Policy', value: csp('*') }, { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), xr-spatial-tracking=(self)' }] },
      // Embeds may be framed by any seller website; camera must be delegated with allow="camera".
      { source: '/embed/:path*', headers: [...security, { key: 'Content-Security-Policy', value: csp('*') }, { key: 'Permissions-Policy', value: 'camera=*, microphone=(), geolocation=()' }] },
      { source: '/seed/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/mediapipe/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/sdk/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=300' }, { key: 'Access-Control-Allow-Origin', value: '*' }] },
    ];
  },
  async redirects() { return [{ source: '/dashboard/create', destination: '/dashboard/skinners/new', permanent: false }]; },
};
