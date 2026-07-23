import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist charge son worker en résolvant un chemin de fichier au
  // runtime (voir src/lib/pdfInvoice.ts) ; le traçage automatique de
  // Next.js ne détecte pas cette référence et n'inclut pas le paquet
  // dans le bundle serverless (déploiements type Vercel). On force son
  // inclusion explicitement.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/pdfjs-dist/**/*"],
  },
};

export default nextConfig;
