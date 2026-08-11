/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
  },
}

export default nextConfig
