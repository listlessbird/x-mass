console.log("popup.js injected");

document.getElementById('startButton').addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: "start-process"});
    });
    window.close();
});

