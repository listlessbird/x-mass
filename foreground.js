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
  console.log("Starting handleListFound");
  const rootList = document.querySelector(
    'div[aria-label="Timeline: Following"]'
  );
  if (!rootList) {
    console.log("No list found, retrying...");
    setTimeout(handleListFound, 1000);
    return;
  }

  let totalUnfollowed = 0;

  async function* userGenerator() {
    while (true) {
      const listItems = rootList.querySelectorAll('button[data-testid="UserCell"]');
      for (const item of listItems) {
        yield item;
      }
      
      const lastItem = listItems[listItems.length - 1];
      lastItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      console.log("Scrolled to last item, waiting 5 seconds");
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  async function unfollowLoop() {
    console.log("Starting unfollow loop");
    for await (const user of userGenerator()) {
      console.log(`Attempting to unfollow user: ${user.textContent}`);
      try {
        await unfollowItem(user);
        totalUnfollowed++;
        console.log(`Successfully unfollowed ${totalUnfollowed} users so far`);
        await new Promise(resolve => setTimeout(resolve, 2000)); 
        console.log("Waiting 2 seconds before next unfollow");
      } catch (error) {
        console.error(`Failed to unfollow user: ${error.message}`);
        console.log(user)
        throw error
      }
    }
  }

  unfollowLoop();
}

async function unfollowItem(item) {
  // pass the `button[data-testid="UserCell"]` element to this function

  const userlink = item.querySelector("a").href;

  const username = userlink.split("/").pop();

  console.log("Attempting to unfollow", username);

  const btnBase = item.querySelector(`button[aria-label="Following @${username}"]`);

  btnBase.click();

  // modal should appear
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const modal = document.querySelector('div[data-testid="confirmationSheetDialog"]')
  const btnUnFollow = modal.querySelector('button[data-testid="confirmationSheetConfirm"]')

  btnUnFollow.click();

  console.log("should've unfollowed", username);
  await new Promise((resolve) => setTimeout(resolve, 5000));
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
