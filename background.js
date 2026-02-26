// background.js — Service Worker

// Open the side panel when the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Enable the side panel for all URLs on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({ enabled: true });

  // Register a context menu item as a secondary trigger
  chrome.contextMenus.create({
    id: "construe-analyze",
    title: "Analyze with Construe",
    contexts: ["selection"]
  });
});

// Handle context menu item click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "construe-analyze" && info.selectionText) {
    chrome.sidePanel.open({ tabId: tab.id });

    // Wait briefly to ensure the side panel is open before sending the message
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: "ANALYZE_TEXT",
        payload: { text: info.selectionText.trim() }
      });
    }, 400);
  }
});

// Relay messages between the content script and the side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SELECTION_MADE") {

    // Open the side panel on the currently active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.sidePanel.open({ tabId: tabs[0].id });

        // Relay the payload to the side panel after a short delay
        setTimeout(() => {
          chrome.runtime.sendMessage({
            type: "ANALYZE_TEXT",
            payload: message.payload
          });
        }, 350);
      }
    });

    sendResponse({ ok: true });
  }

  // Return true to keep the message channel open for async responses
  return true;
});
