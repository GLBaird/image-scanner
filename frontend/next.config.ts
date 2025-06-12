import type { NextConfig } from 'next';

const externalHostnames: string[] = ['avatars.githubusercontent.com', 'lh3.googleusercontent.com'];

const nextConfig: NextConfig = {
    // --- for importing .proto files at runtime ---
    output: 'standalone',
    outputFileTracingIncludes: {
        '/': ['src/grpc/protos/service-jobs.proto'],
    },
    serverExternalPackages: ['@grpc/proto-loader', 'grpc'],
    // --- DEV (Turbopack) ---
    turbopack: {
        rules: {
            // turn every *.svg into a React component
            '*.svg': {
                loaders: ['@svgr/webpack'],
                as: '*.js', // tell Turbopack the output is JS/TS
            },
        },
    },

    // --- PROD (Webpack) ---
    webpack(config) {
        // every “*.svg?component” will run through SVGR in prod
        config.module.rules.push({
            test: /\.svg$/i,
            issuer: /\.[jt]sx?$/,
            resourceQuery: /component/, // ONLY when “?component” is present
            use: ['@svgr/webpack'],
        });
        return config;
    },
    images: {
        remotePatterns: externalHostnames.map((hostname) => ({
            protocol: 'https',
            hostname,
        })),
    },
};

export default nextConfig;
