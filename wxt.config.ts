import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Chrome AI Assistant',
    description: 'AI-powered browser assistant with BYOK backend and human-in-the-loop safety',
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
      default_title: 'Open AI Assistant Side Panel',
    },
  },
});
