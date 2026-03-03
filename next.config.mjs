import path from "node:path";
import { config as loadEnv } from "dotenv";

const projectRoot = process.cwd();
console.log("[env] project root:", projectRoot);

// Ensure env vars load before Next compiles (helps on Windows shells).
loadEnv({ path: path.join(projectRoot, ".env.local"), override: true, debug: true });
loadEnv({ path: path.join(projectRoot, ".env"), override: true, debug: true });

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true
};

export default nextConfig;
