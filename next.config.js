/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  devIndicators: false,
  // markitdown-js pulls in unzipper, which has an optional (never-used-by-us) require
  // of @aws-sdk/client-s3 for its S3-backed stream mode. Left to webpack, that require
  // gets statically traced and fails the build since we don't install the AWS SDK.
  // Marking the package external makes Node require() it natively at runtime instead.
  serverExternalPackages: ["markitdown-js"],
};

module.exports = nextConfig;
