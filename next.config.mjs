/** @type {import('next').NextConfig} */
// When using a custom domain, GitHub Pages serves from root — basePath must be empty.
// Only use the repo-name basePath when deploying to username.github.io/repo (no custom domain).
const isGithubActions = process.env.GITHUB_ACTIONS === "true"
const hasCustomDomain = Boolean(process.env.CUSTOM_DOMAIN)
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1]
const basePath = isGithubActions && !hasCustomDomain && repoName ? `/${repoName}` : ""

const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
