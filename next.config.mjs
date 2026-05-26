import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the workspace root explicitly. Without this, Next 15.5+ walks up the
  // filesystem and may pick the wrong lockfile (e.g. a stray ~/pnpm-lock.yaml)
  // as the workspace root for build-trace purposes.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
