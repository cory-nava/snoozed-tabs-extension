// Regenerates the README screenshots in docs/images. Run: npm run screenshots
// Needs network access for favicons and the GitHub "Download ZIP" shot.
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const repo = path.resolve(__dirname, '..');
const out = path.join(repo, 'docs/images');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const ctx = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    deviceScaleFactor: 2,
    viewport: { width: 1100, height: 700 },
    args: [`--disable-extensions-except=${repo}`, `--load-extension=${repo}`],
  });

  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const extId = sw.url().split('/')[2];

  // 1. chrome://extensions with Developer mode on
  const ext = await ctx.newPage();
  await ext.goto('chrome://extensions');
  const toggle = ext.locator('#devMode');
  if (!(await toggle.isChecked())) await toggle.click();
  await ext.waitForTimeout(800);
  await ext.screenshot({ path: path.join(out, 'chrome-extensions-dev-mode.png') });

  // Seed realistic snoozed tabs
  const popup = await ctx.newPage();
  await popup.setViewportSize({ width: 550, height: 560 });
  await popup.goto(`chrome-extension://${extId}/popup/popup.html`);
  const now = Date.now();
  const H = 3600e3, D = 24 * H;
  const fav = d => `https://www.google.com/s2/favicons?domain=${d}&sz=64`;
  await popup.evaluate(async tabs => chrome.storage.local.set({ snoozed_tabs: tabs }), [
    { id: 's1', url: 'https://github.com/navapbc', title: 'Nava PBC · GitHub', favIconUrl: fav('github.com'), snoozeOption: 'later-today', snoozedAt: now, unsnoozeAt: now + 3 * H },
    { id: 's2', url: 'https://developer.chrome.com/docs/extensions', title: 'Chrome Extensions documentation', favIconUrl: fav('developer.chrome.com'), snoozeOption: 'tomorrow', snoozedAt: now, unsnoozeAt: now + 1 * D },
    { id: 's3', url: 'https://www.nytimes.com/section/technology', title: 'Technology - The New York Times', favIconUrl: fav('nytimes.com'), snoozeOption: 'next-week', snoozedAt: now, unsnoozeAt: now + 5 * D },
    { id: 's4', url: 'https://en.wikipedia.org/wiki/Time_management', title: 'Time management - Wikipedia', favIconUrl: fav('wikipedia.org'), snoozeOption: 'someday', snoozedAt: now, unsnoozeAt: new Date('2099-12-31').getTime() },
  ]);
  await popup.reload();
  await popup.waitForTimeout(800);

  // 2. Main popup, hovering an option to show the "Will unsnooze on" hint
  await popup.hover('.snooze-btn[data-option="tomorrow"]');
  await popup.waitForTimeout(200);
  await popup.screenshot({ path: path.join(out, 'popup-snooze-options.png') });

  // 3. Snoozed list
  await popup.mouse.move(0, 0);
  await popup.click('#view-snoozed-btn');
  await popup.evaluate(() => document.activeElement.blur());
  await popup.waitForTimeout(1200);
  await popup.screenshot({ path: path.join(out, 'popup-snoozed-list.png') });

  // 4. Extension card after loading
  await ext.bringToFront();
  await ext.reload();
  await ext.waitForTimeout(800);
  const card = ext.locator('extensions-item').first();
  await card.screenshot({ path: path.join(out, 'chrome-extensions-card.png') });

  // 5. GitHub "Code" menu with Download ZIP
  const gh = await ctx.newPage();
  await gh.setViewportSize({ width: 1280, height: 760 });
  await gh.goto('https://github.com/cory-nava/snoozed-tabs-extension');
  await gh.getByRole('button', { name: 'Code' }).first().click();
  await gh.getByText('Download ZIP').waitFor();
  await gh.waitForTimeout(500);
  await gh.screenshot({ path: path.join(out, 'github-download-zip.png'), clip: { x: 500, y: 150, width: 780, height: 560 } });

  await ctx.close();
})().catch(e => { console.error(e); process.exit(1); });
