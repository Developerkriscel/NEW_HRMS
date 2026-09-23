import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js'

/** @type {(phase: string) => import('next').NextConfig} */
const isDevServer = (phase) => phase === PHASE_DEVELOPMENT_SERVER

const nextConfig = (phase) => ({
  distDir: isDevServer(phase) ? '.next-dev' : '.next',
  reactStrictMode: false,
  ...(isDevServer(phase) ? {} : { output: 'standalone' }),
  // pdf-parse (via pdfjs-dist) and mammoth (Step 6 resume parsing, see
  // lib/resumeParser.js) are Node-only libraries with conditional exports
  // that webpack's RSC bundling can't resolve correctly — left external so
  // they're required natively instead of bundled ("Object.defineProperty
  // called on non-object" otherwise). pdfkit (Step 13 offer-letter PDFs,
  // see lib/offerPdfGenerator.js) has the same problem for a different
  // reason: it reads its standard-14-font .afm files off disk relative to
  // its own package location at runtime, and webpack's bundling doesn't
  // carry those non-JS data files into .next/server/chunks — external
  // keeps it a plain node_modules require so those files stay reachable.
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist', 'mammoth', 'pdfkit'],
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
})

export default nextConfig
