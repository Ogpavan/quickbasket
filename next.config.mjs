/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "ecommerce.efoxtechnologies.com"
      },
      {
        protocol: "https",
        hostname: "blinkit.com"
      }
    ]
  }
};

export default nextConfig;
