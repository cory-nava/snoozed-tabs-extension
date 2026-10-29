// Loads the real extension into Chromium and drives it end to end.
const { test: base, expect, chromium } = require('@playwright/test');
const path = require('path');

// EXTENSION_DIR lets you point the suite at another build, e.g. an older commit
const EXTENSION_DIR = process.env.EXTENSION_DIR || path.resolve(__dirname, '../..');

const test = base.extend({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`]
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker');
    await use(worker.url().split('/')[2]);
  }
});

// Opens a page with an extension origin so tests can call chrome.* APIs directly.
async function openExtensionPage(context, extensionId) {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  return page;
}

async function openTarget(context, name) {
  const url = `data:text/html,<title>${name}</title><h1>${name}</h1>`;
  const page = await context.newPage();
  await page.goto(url);
  return url;
}

const tabsWithUrl = (context, url) => context.pages().filter(p => p.url() === url);

async function snooze(extPage, url, option) {
  return extPage.evaluate(async ({ url, option }) => {
    const all = await chrome.tabs.query({});
    const tab = all.find(t => t.url === url);
    const response = await chrome.runtime.sendMessage({ action: 'snooze-tab', tabId: tab.id, snoozeOption: option });
    const { snoozed_tabs } = await chrome.storage.local.get('snoozed_tabs');
    return { response, entry: snoozed_tabs.find(t => t.url === url) };
  }, { url, option });
}

// Moves a snoozed tab's wake-up time to `ms` from now.
async function dueIn(extPage, id, ms) {
  await extPage.evaluate(async ({ id, ms }) => {
    const when = Date.now() + ms;
    const { snoozed_tabs } = await chrome.storage.local.get('snoozed_tabs');
    snoozed_tabs.find(t => t.id === id).unsnoozeAt = when;
    await chrome.storage.local.set({ snoozed_tabs });
    await chrome.alarms.create(`unsnooze_${id}`, { when });
  }, { id, ms });
}

test('the popup shows all nine snooze options', async ({ context, extensionId }) => {
  const page = await openExtensionPage(context, extensionId);

  await expect(page.locator('.snooze-btn')).toHaveCount(9);
  await page.hover('.snooze-btn[data-option="tomorrow"]');
  await expect(page.locator('#snooze-details')).toContainText('Will unsnooze on: Tomorrow at');
});

test('snoozing closes the tab and lists it in the popup', async ({ context, extensionId }) => {
  const url = await openTarget(context, 'Snooze me');
  const ext = await openExtensionPage(context, extensionId);

  const { response, entry } = await snooze(ext, url, 'next-week');

  expect(response).toEqual({ success: true });
  expect(entry.title).toBe('Snooze me');
  await expect.poll(() => tabsWithUrl(context, url).length).toBe(0);
  expect(await ext.evaluate(id => chrome.alarms.get(`unsnooze_${id}`), entry.id)).toBeTruthy();

  await ext.reload();
  await ext.click('#view-snoozed-btn');
  await expect(ext.locator('.snoozed-tab-item .tab-title')).toHaveText('Snooze me');
});

test('a snoozed tab reopens exactly once when its alarm wakes a stopped service worker', async ({ context, extensionId }) => {
  const url = await openTarget(context, 'Wake me once');
  const ext = await openExtensionPage(context, extensionId);
  const { entry } = await snooze(ext, url, 'later-today');
  await dueIn(ext, entry.id, 3000);
  await ext.close();

  // Chrome stops idle extension workers; the alarm then has to start it again
  const cdp = await context.newCDPSession(await context.newPage());
  await cdp.send('ServiceWorker.enable');
  await cdp.send('ServiceWorker.stopAllWorkers');

  await expect.poll(() => tabsWithUrl(context, url).length, { timeout: 10_000 }).toBe(1);
  // Give a duplicate time to appear before declaring success
  await new Promise(resolve => setTimeout(resolve, 2000));
  expect(tabsWithUrl(context, url)).toHaveLength(1);

  const check = await openExtensionPage(context, extensionId);
  expect(await check.evaluate(async () => (await chrome.storage.local.get('snoozed_tabs')).snoozed_tabs)).toEqual([]);
});

test('a snoozed tab reopens exactly once when its alarm fires on a running worker', async ({ context, extensionId }) => {
  const url = await openTarget(context, 'Wake me awake');
  const ext = await openExtensionPage(context, extensionId);
  const { entry } = await snooze(ext, url, 'later-today');
  await dueIn(ext, entry.id, 2000);

  await expect.poll(() => tabsWithUrl(context, url).length, { timeout: 10_000 }).toBe(1);
  await new Promise(resolve => setTimeout(resolve, 2000));
  expect(tabsWithUrl(context, url)).toHaveLength(1);
});

test('clicking a tab in the snoozed list reopens it once and removes it from the list', async ({ context, extensionId }) => {
  const url = await openTarget(context, 'Bring me back');
  const ext = await openExtensionPage(context, extensionId);
  await snooze(ext, url, 'tomorrow');

  await ext.reload();
  await ext.click('#view-snoozed-btn');
  await ext.dblclick('.snoozed-tab-item .tab-title');

  await expect.poll(() => tabsWithUrl(context, url).length).toBe(1);
  await expect(ext.locator('#empty-state')).toBeVisible();
  await new Promise(resolve => setTimeout(resolve, 1000));
  expect(tabsWithUrl(context, url)).toHaveLength(1);
});

test('"Clear All" removes every snoozed tab without reopening any', async ({ context, extensionId }) => {
  const urls = [await openTarget(context, 'One'), await openTarget(context, 'Two'), await openTarget(context, 'Three')];
  const ext = await openExtensionPage(context, extensionId);
  for (const url of urls) await snooze(ext, url, 'tomorrow');

  await ext.reload();
  await ext.click('#view-snoozed-btn');
  await expect(ext.locator('.snoozed-tab-item')).toHaveCount(3);
  await ext.click('#clear-all-btn');
  await ext.click('#confirm-clear-btn');

  await expect(ext.locator('#empty-state')).toBeVisible();
  expect(await ext.evaluate(async () => (await chrome.storage.local.get('snoozed_tabs')).snoozed_tabs)).toEqual([]);
  for (const url of urls) expect(tabsWithUrl(context, url)).toHaveLength(0);
});

test('the extension ID is pinned by the manifest key, so reinstalling from a new folder keeps snoozed tabs', async ({ extensionId }) => {
  expect(extensionId).toBe('bebabkmmcjedekgibjelfbonloioeicb');
});

test('a tab that came due while Chrome was closed reopens once when Chrome starts', async ({ extensionId }, testInfo) => {
  const profile = testInfo.outputPath('profile');
  const launch = () => chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`]
  });

  let browser = await launch();
  const url = await openTarget(browser, 'Due while closed');
  const ext = await openExtensionPage(browser, extensionId);
  const { entry } = await snooze(ext, url, 'later-today');
  await dueIn(ext, entry.id, 2000);
  await browser.close();

  await new Promise(resolve => setTimeout(resolve, 4000));
  browser = await launch();
  try {
    await expect.poll(() => tabsWithUrl(browser, url).length, { timeout: 15_000 }).toBe(1);
    await new Promise(resolve => setTimeout(resolve, 2000));
    expect(tabsWithUrl(browser, url)).toHaveLength(1);
  } finally {
    await browser.close();
  }
});

test('the "Snooze Tab" right-click menu item is registered', async ({ context, extensionId }) => {
  const ext = await openExtensionPage(context, extensionId);

  // update() rejects if no menu item with this id exists
  await expect(ext.evaluate(() => chrome.contextMenus.update('snooze-tab', { title: 'Snooze Tab' })))
    .resolves.toBeUndefined();
});
