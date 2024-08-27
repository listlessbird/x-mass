let urlChangeInterval;

const ctx = {
  username: null,
  followingUrl: null,
};

function cleanupPreviousOperations() {
  if (urlChangeInterval) {
    clearInterval(urlChangeInterval);
  }
 
}

function watchForUrlChanges() {
  let lastUrl = window.location.href;
  urlChangeInterval = setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log("URL changed to", lastUrl);
      run();
    }
  }, 1000);
}
async function run() {
  const acceptableUrls = ["https://x.com/", "https://x.com/following"];

  try {
    cleanupPreviousOperations();

    const pageIsLoaded = document.querySelector("#react-root");
    if (!pageIsLoaded) {
      console.log("Page not loaded yet, waiting...");
      setTimeout(run, 1000);
      return;
    }

    const currentUrl = window.location.href;
    console.log("Currently at", currentUrl);

    if (!ctx.username) {
      ctx.username = getUsernameFromPage();
      if (!ctx.username) {
        // Try to extract username from URL
        const urlMatch = currentUrl.match(/https:\/\/x\.com\/([^\/]+)/);
        if (urlMatch && urlMatch[1]) {
          ctx.username = urlMatch[1];
          console.log("Username extracted from URL:", ctx.username);
        } else {
          console.log("Username not found in page or URL");
          setTimeout(run, 1000);
          return;
        }
      }
    }

    const username = ctx.username;
    const userUrl = `https://x.com/${username}`;
    const followingUrl = `https://x.com/${username}/following`;

    if (currentUrl !== userUrl && currentUrl !== followingUrl) {
      console.log("Navigating to the user's following page");
      chrome.runtime.sendMessage({ type: "gotUser", username, followingUrl });
    } else if (currentUrl === followingUrl) {
      console.log("On the following page, calling handleListFound");
      handleListFound();
    } else {
      console.log("On an unexpected page, waiting...");
      setTimeout(run, 1000);
    }
  } catch (error) {
    console.error("Error in run function:", error);
  }
}

function getUsernameFromPage() {
  const el = document.querySelector(
    'button[data-testid="SideNav_AccountSwitcher_Button"] div[style="text-overflow: unset; color: rgb(113, 118, 123);"] .css-1jxf684.r-bcqeeo.r-1ttztb7.r-qvutc0.r-poiln3'
  );

  ctx.username = el ? el.textContent : null;
  return ctx.username;
}

async function handleListFound() {
  console.log("at handleListFound");
  const rootList = document.querySelector(
    'div[aria-label="Timeline: Following"]'
  );
  if (!rootList) {
    console.log("No list found, retrying...");
    setTimeout(handleListFound, 1000);
    return;
  }

  async function* scrollAndCount() {
    let previousLength = 0;
    while (true) {
      const listItems = rootList.querySelectorAll(
        'button[data-testid="UserCell"]'
      );
      const currentLength = listItems.length;
      if (currentLength > previousLength) {
        console.log(`${currentLength} users found in the following list`);
        const lastItem = listItems[currentLength - 1];
        lastItem.scrollIntoView();
        previousLength = currentLength;
        

        console.log("currentLength", currentLength);
        console.log("waiting 10 seconds");
        await new Promise(resolve => setTimeout(resolve, 10 * 1000));
        
        yield currentLength;
      } else {
        console.log("No new items found, stopping");
        return currentLength;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const finalCount = await (async () => {
    let lastCount = 0;
    for await (const count of scrollAndCount()) {
      lastCount = count;
    }
    return lastCount;
  })();
  
   const listItems = rootList.querySelectorAll(
        'button[data-testid="UserCell"]'
      );

    console.log("listItems", listItems);


      const arr = Array.from(listItems);

      arr.slice(-5).forEach(item => {
      
        const userlink =  item.querySelector("a").href
        
        const username = userlink.split("/").pop();
        console.log("username", username);
      })



  console.log(`Final count: ${finalCount} users in the following list`);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("Foreground message received:", msg);
  if (msg.action === "start-process") {
    run();
    watchForUrlChanges();
  }
});

run();
watchForUrlChanges();
