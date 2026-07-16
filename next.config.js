/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  devIndicators: false,
  // markitdown-js pulls in unzipper, which has an optional (never-used-by-us) require
  // of @aws-sdk/client-s3 for its S3-backed stream mode. Left to webpack, that require
  // gets statically traced and fails the build since we don't install the AWS SDK.
  // Marking the package external makes Node require() it natively at runtime instead.
  // @huggingface/transformers loads onnxruntime-node's native .node binding at runtime;
  // webpack can't bundle that, so it needs the same external treatment.
  serverExternalPackages: ["markitdown-js", "@huggingface/transformers", "onnxruntime-node"],
};

module.exports = nextConfig;
