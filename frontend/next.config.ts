import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build a static site (out/) so FastAPI can serve the whole frontend.
  output: "export",
  // Emit /route/index.html so directory-style static serving resolves cleanly.
  trailingSlash: true,
};

export default nextConfig;
