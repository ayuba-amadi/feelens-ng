import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

const canUploadSentrySourceMaps = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
);

const sentryRelease = process.env.SENTRY_RELEASE || undefined;

const sentryBuildPlugin = canUploadSentrySourceMaps
  ? sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
      sourcemaps: {
        filesToDeleteAfterUpload: ['dist/**/*.map'],
      },
      release: sentryRelease
        ? {
            name: sentryRelease,
            inject: true,
          }
        : undefined,
    })
  : null;

export default defineConfig({
  plugins: [react(), ...(sentryBuildPlugin ? [sentryBuildPlugin] : [])],
  build: {
    sourcemap: canUploadSentrySourceMaps ? 'hidden' : false,
  },
});

