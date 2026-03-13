import { defineConfig } from 'vitepress';
import path from 'node:path';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  vite: {
    resolve: {
      alias: {
        // Point the browser entry to the TypeScript source so Vite can
        // bundle it as ESM with proper named exports.
        'swaggie/browser': path.resolve(__dirname, '../../src/browser.ts'),
        // Stub out Node built-ins that eta references but never calls in browser mode
        'node:fs': path.resolve(__dirname, '../shims/node-fs.ts'),
        'node:path': path.resolve(__dirname, '../shims/node-path.ts'),
      },
    },
    optimizeDeps: {
      // Force Vite to pre-bundle the CJS `case` package so named imports work
      include: ['case'],
    },
    build: {
      commonjsOptions: {
        // Allow named imports from CommonJS modules
        transformMixedEsModules: true,
      },
    },
    ssr: {
      // Process `case` through Vite's CJS interop in SSR mode too
      noExternal: ['case'],
    },
  },
  title: 'Swaggie',
  description:
    'Generate fully typed TypeScript API clients from your OpenAPI 3 spec — zero runtime overhead.',

  head: [['link', { rel: 'icon', href: '/swaggie.svg', type: 'image/svg+xml' }]],

  themeConfig: {
    logo: '/swaggie.svg',

    nav: [
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/' },
      { text: 'Reference', link: '/reference/cli', activeMatch: '/reference/' },
      { text: 'Playground', link: '/playground' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Configuration', link: '/guide/configuration' },
          { text: 'Templates', link: '/guide/templates' },
          { text: 'Advanced Options', link: '/guide/advanced' },
          { text: 'Programmatic API', link: '/guide/programmatic' },
        ],
      },
      {
        text: 'Reference',
        items: [{ text: 'CLI Reference', link: '/reference/cli' }],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/yhnavein/swaggie' }],

    editLink: {
      pattern: 'https://github.com/yhnavein/swaggie/edit/master/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © Swaggie contributors',
    },

    search: {
      provider: 'local',
    },
  },
});
