/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode:false,
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'img.freepik.com' }
        ]
    }
};

export default nextConfig;
