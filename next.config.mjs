/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode:false,
    images: {
        remotePatterns: [
            // freepik kept for backward-compat with covers saved before the
            // switch to high-res Unsplash photos.
            { protocol: 'https', hostname: 'img.freepik.com' },
            { protocol: 'https', hostname: 'images.unsplash.com' }
        ]
    }
};

export default nextConfig;
