import { appTools, defineConfig } from '@modern-js/app-tools';
import { moduleFederationPlugin } from '@module-federation/modern-js';

// https://modernjs.dev/en/configure/app/usage
export default defineConfig({
  dev: {
    port: 3062,
    // FIXME: it should be removed , related issue: https://github.com/web-infra-dev/modern.js/issues/5999
    host: '0.0.0.0',
  },
  runtime: {
    router: true,
  },
  server: {
    ssr: {
      mode: 'stream',
    },
    // ssrByRouteIds: ['remote@layout', 'remote@page', 'remote@a/page'],
    port: 3062,
  },
  plugins: [
    appTools({
      bundler: 'experimental-rspack',
    }),
    moduleFederationPlugin({
      dataLoader: {
        baseName: 'federationHost',
        // partialSSRRemotes:['remote']
      },
    }),
  ],
});
