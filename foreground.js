// This script gets injected into any opened page
// whose URL matches the pattern defined in the manifest
// (see "content_script" key).
// Several foreground scripts can be declared
// and injected into the same or different pages.

console.log(
  "This prints to the console of the page (injected only if the page url matched)"
);

async function run() {
  const pageIsLoaded = document.querySelector("#react-root");
  console.log(pageIsLoaded);

  let username;

  if (pageIsLoaded) {
    const el = document.querySelector(
      'button[data-testid="SideNav_AccountSwitcher_Button"] div[style="text-overflow: unset; color: rgb(113, 118, 123);"] .css-1jxf684.r-bcqeeo.r-1ttztb7.r-qvutc0.r-poiln3'
    );

    console.log(el);
    console.log(el.textContent);
    username = el.textContent;
  }

  const currentUrl = window.location.href;

  console.log("currently at", currentUrl);

  const userUrl = `https://x.com/${username}`;

  if (username && currentUrl !== userUrl) {
    console.log("Navigating to the current user page");
    chrome.runtime.sendMessage({ type: "gotUser", username: username });
  }
}

// let t = setTimeout(async () => {
//     await run()
//     clearTimeout(t)
// }, 5 * 1000);
// console.log("on timeout");

function observePage() {
  const observer = new MutationObserver((mutationsList, observer) => {
    for (let mutation of mutationsList) {
      if (mutation.type === "childList") {
        // Run the function only if the react root is present
        if (document.querySelector("#react-root")) {
          run();
          observer.disconnect(); // Stop observing after running
        }
      }
    }
  });

  observer.observe(document, { childList: true, subtree: true });
}

function start() {
  console.log("Starting");
  setTimeout(() => {
    if (!document.querySelector("#react-root")) {
      observePage();
    } else {
      run();
    }
  }, 5000);
}
