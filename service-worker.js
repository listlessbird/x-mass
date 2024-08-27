// This is the service worker script, which executes in its own context
// when the extension is installed or refreshed (or when you access its console).
// It would correspond to the background script in chrome extensions v2.

console.log(
  "This prints to the console of the service worker (background script)"
);

// Importing and using functionality from external files is also possible.
importScripts("service-worker-utils.js");

// If you want to import a file that is deeper in the file hierarchy of your
// extension, simply do `importScripts('path/to/file.js')`.
// The path should be relative to the file `manifest.json`.

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({
    text: "OFF",
  });
});

chrome.action.onClicked.addListener(async (tab) => {
  console.log("Starting process");

  const prevState = await chrome.action.getBadgeText({ tabId: tab.id });
  const nextState = prevState === "ON" ? "OFF" : "ON";

  chrome.action.setBadgeText({
    tabId: tab.id,
    text: nextState,
  });

  if (nextState === "ON") {
    chrome.tabs.sendMessage(tab.id, { action: "start-process" });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("background msg: ", msg);
  if (msg.type === "gotUser" && msg.followingUrl) {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      console.log({ currentTab: currentTab, newUrl: msg.followingUrl });
      if (currentTab && currentTab.url !== msg.followingUrl) {
        chrome.tabs.update(currentTab.id, { url: msg.followingUrl });
      }
    });
  }
});

chrome.commands.onCommand.addListener((command) => {
  console.log("Command received:", command);
  if (command === "Ctrl+M") {
    chrome.runtime.reload();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.reload(tabs[0].id);
    });
  }
});
