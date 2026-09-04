export default defineContentScript({
  matches: ['*://*/*'],
  registration: 'runtime',
  main() {
    console.log('Chrome AI Assistant programmatic content script injected');
  },
});
