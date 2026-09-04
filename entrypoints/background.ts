export default defineBackground(() => {
  console.log('Chrome AI Assistant background service worker initialized');

  // Open side panel on action click per ADR-001, ADR-007
  chrome.sidePanel
    ?.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Failed to set side panel behavior:', error));
});
