/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        externalDir: true,
    },
    transpilePackages: ['@isarmstrong/jitterbug', '@isarmstrong/jitterbug-next'],
    webpack: (config, { isServer }) => {
        // Add support for importing from parent directories
        config.resolve.symlinks = true;
        // Add support for TypeScript extensions
        config.resolve.extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
        return config;
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin'
                    },
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'require-corp'
                    }
                ]
            }
        ];
    }
}

module.exports = nextConfig 