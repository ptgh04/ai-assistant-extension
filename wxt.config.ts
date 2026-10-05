import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifestVersion: 3,
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  entrypointsDir: '../entrypoints',
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    minimum_chrome_version: '116',
    name: 'AI Helper',
    description: 'A local-first AI assistant that lives in the Chrome Side Panel.',
    permissions: [
      'storage',
      'activeTab',
      'sidePanel',
      'contextMenus',
      'scripting',
    ],
    host_permissions: [
      'https://api.openai.com/*',
      'https://api.anthropic.com/*',
      'https://generativelanguage.googleapis.com/*',
    ],
    action: {
      default_title: 'Open AI Helper',
    },
  },
});
