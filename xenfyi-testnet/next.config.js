/** @type {import('next').NextConfig} */
const { i18n } = require("./next-i18next.config");

const nextConfig = {
  i18n,
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  compiler: {
    emotion: true,
  },
  async redirects() {
    return [
      {
        source: "/mint",
        destination: "/app/mint/1",
        permanent: false,
      },
      {
        source: "/mint/:path*",
        destination: "/app/mint/1",
        permanent: false,
      },
      {
        source: "/stake",
        destination: "/app/stake",
        permanent: false,
      },
      {
        source: "/stake/:path*",
        destination: "/app/stake",
        permanent: false,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@react-native-async-storage/async-storage': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
