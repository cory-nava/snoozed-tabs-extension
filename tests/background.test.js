import { createFakeChrome } from './helpers/fakeChrome.js';
import { SnoozeService } from '../background/snoozeService.js';

const HOUR = 60 * 60 * 1000;
const SOMEDAY = new Date('2099-12-31').getTime();

function snoozedEntry(overrides = {}) {
  const id = overrides.id || 'snoozed_1_42';
  return {
    id,
    originalTabId: 42,
    url: `https://example.com/${id}`,
    title: `Example ${id}`,
    favIconUrl: 'https://example.com/favicon.ico',
    snoozeOption: 'later-today',
    snoozedAt: Date.now() - 3 * HOUR,
    unsnoozeAt: Date.now() + 3 * HOUR,
    windowId: 1,
    ...overrides
  };
}

// Boots a service the way Chrome does: run the worker script, then deliver events.
async function bootService({ storage, tabs } = {}) {
  global.chrome = createFakeChrome({ storage, tabs });
  const service = new SnoozeService();
  const started = service.start();
  return { service, started, chrome: global.chrome };
}

function storedTabs(chrome) {
  return chrome._test.store.snoozed_tabs || [];
}

afterEach(() => {
  delete global.chrome;
});

describe('double reopen regression', () => {
  test('a due tab opens once when its alarm wakes a stopped service worker', async () => {
    // The alarm is due, so startup restore and the alarm both see it as expired.
    const entry = snoozedEntry({ unsnoozeAt: Date.now() - 1000 });
    global.chrome = createFakeChrome({ storage: { snoozed_tabs: [entry] } });
    const service = new SnoozeService();

    const started = service.start();
    const alarmHandled = chrome.alarms.onAlarm.dispatch({ name: `unsnooze_${entry.id}` });
    await Promise.all([started, ...alarmHandled]);

    expect(chrome._test.tabsWithUrl(entry.url)).toHaveLength(1);
    expect(storedTabs(chrome)).toHaveLength(0);
  });

  test('a due tab opens once when startup restore and the alarm overlap for several tabs', async () => {
    const entries = [1, 2, 3].map(n => snoozedEntry({ id: `snoozed_${n}_${n}`, unsnoozeAt: Date.now() - n }));
    global.chrome = createFakeChrome({ storage: { snoozed_tabs: entries } });
    const service = new SnoozeService();

    const started = service.start();
    const alarmsHandled = entries.flatMap(e => chrome.alarms.onAlarm.dispatch({ name: `unsnooze_${e.id}` }));
    await Promise.all([started, ...alarmsHandled]);

    for (const entry of entries) {
      expect(chrome._test.tabsWithUrl(entry.url)).toHaveLength(1);
    }
    expect(storedTabs(chrome)).toHaveLength(0);
  });

  test('a due tab opens once at browser launch, when startup restore, onStartup and the alarm all overlap', async () => {
    const entry = snoozedEntry({ unsnoozeAt: Date.now() - HOUR });
    global.chrome = createFakeChrome({ storage: { snoozed_tabs: [entry] } });
    const service = new SnoozeService();

    const started = service.start();
    const onStartup = chrome.runtime.onStartup.dispatch();
    const alarmHandled = chrome.alarms.onAlarm.dispatch({ name: `unsnooze_${entry.id}` });
    await Promise.all([started, ...onStartup, ...alarmHandled]);

    expect(chrome._test.tabsWithUrl(entry.url)).toHaveLength(1);
    expect(storedTabs(chrome)).toHaveLength(0);
  });

  test('clicking "unsnooze" while the alarm fires opens the tab once', async () => {
    const entry = snoozedEntry();
    const { started } = await bootService({ storage: { snoozed_tabs: [entry] } });
    await started;

    await Promise.all([
      chrome._test.sendMessage({ action: 'unsnooze-tab', snoozedTabId: entry.id }),
      ...chrome.alarms.onAlarm.dispatch({ name: `unsnooze_${entry.id}` })
    ]);

    expect(chrome._test.tabsWithUrl(entry.url)).toHaveLength(1);
  });

  test('double-clicking "unsnooze" opens the tab once', async () => {
    const entry = snoozedEntry();
    const { started } = await bootService({ storage: { snoozed_tabs: [entry] } });
    await started;

    const responses = await Promise.all([
      chrome._test.sendMessage({ action: 'unsnooze-tab', snoozedTabId: entry.id }),
      chrome._test.sendMessage({ action: 'unsnooze-tab', snoozedTabId: entry.id })
    ]);

    expect(responses.every(r => r.success)).toBe(true);
    expect(chrome._test.tabsWithUrl(entry.url)).toHaveLength(1);
  });
});

describe('concurrent storage writes', () => {
  test('"Clear All" removes every tab even though the popup sends removes in parallel', async () => {
    const entries = [1, 2, 3, 4, 5].map(n => snoozedEntry({ id: `snoozed_${n}_${n}` }));
    const { started } = await bootService({ storage: { snoozed_tabs: entries } });
    await started;

    await Promise.all(entries.map(e =>
      chrome._test.sendMessage({ action: 'remove-snoozed-tab', snoozedTabId: e.id })
    ));

    expect(storedTabs(chrome)).toEqual([]);
    expect(chrome._test.openTabs.size).toBe(0);
  });

  test('snoozing two tabs at once keeps both', async () => {
    const tabs = [
      { id: 1, url: 'https://a.example/', title: 'A', windowId: 1 },
      { id: 2, url: 'https://b.example/', title: 'B', windowId: 1 }
    ];
    const { started } = await bootService({ tabs });
    await started;

    await Promise.all(tabs.map(tab =>
      chrome._test.sendMessage({ action: 'snooze-tab', tabId: tab.id, snoozeOption: 'tomorrow' })
    ));

    expect(storedTabs(chrome).map(t => t.url).sort()).toEqual(['https://a.example/', 'https://b.example/']);
  });
});

describe('service worker startup', () => {
  test('restarting the worker does not re-create the context menu', async () => {
    global.chrome = createFakeChrome();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // First install, then two later wake-ups of the same worker script
    await new SnoozeService().start();
    chrome.runtime.onInstalled.dispatch({ reason: 'install' });
    await new SnoozeService().start();
    await new SnoozeService().start();

    expect(chrome.contextMenus.create).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  test('restores overdue tabs on startup but never "someday" tabs', async () => {
    const overdue = snoozedEntry({ id: 'snoozed_1_1', unsnoozeAt: Date.now() - HOUR });
    const future = snoozedEntry({ id: 'snoozed_2_2' });
    const someday = snoozedEntry({ id: 'snoozed_3_3', snoozeOption: 'someday', unsnoozeAt: SOMEDAY });
    const { started } = await bootService({ storage: { snoozed_tabs: [overdue, future, someday] } });
    await started;

    expect(chrome._test.tabsWithUrl(overdue.url)).toHaveLength(1);
    expect(storedTabs(chrome).map(t => t.id)).toEqual([future.id, someday.id]);
  });
});

describe('message handling', () => {
  let started;
  const tab = { id: 7, url: 'https://news.example/story', title: 'Story', favIconUrl: 'https://news.example/icon.png', windowId: 3 };

  beforeEach(async () => {
    ({ started } = await bootService({ tabs: [tab] }));
    await started;
  });

  test('snooze-tab stores the tab, schedules an alarm, and closes the tab', async () => {
    const before = Date.now();
    const response = await chrome._test.sendMessage({ action: 'snooze-tab', tabId: tab.id, snoozeOption: 'later-today' });

    expect(response).toEqual({ success: true });
    const [stored] = storedTabs(chrome);
    expect(stored).toMatchObject({ url: tab.url, title: tab.title, favIconUrl: tab.favIconUrl, snoozeOption: 'later-today', windowId: 3 });
    expect(stored.unsnoozeAt).toBeGreaterThanOrEqual(before + 3 * HOUR);
    expect(chrome._test.alarms.get(`unsnooze_${stored.id}`).scheduledTime).toBe(stored.unsnoozeAt);
    expect(chrome._test.openTabs.has(tab.id)).toBe(false);
  });

  test('snooze-tab with "someday" stores the tab without an alarm', async () => {
    await chrome._test.sendMessage({ action: 'snooze-tab', tabId: tab.id, snoozeOption: 'someday' });

    expect(storedTabs(chrome)).toHaveLength(1);
    expect(chrome._test.alarms.size).toBe(0);
  });

  test('snooze-tab reports an error for a tab that no longer exists', async () => {
    const response = await chrome._test.sendMessage({ action: 'snooze-tab', tabId: 999, snoozeOption: 'tomorrow' });

    expect(response.success).toBe(false);
    expect(response.error).toMatch(/No tab/);
    expect(storedTabs(chrome)).toHaveLength(0);
  });

  test('unsnooze-tab opens the tab in the background and forgets it', async () => {
    await chrome._test.sendMessage({ action: 'snooze-tab', tabId: tab.id, snoozeOption: 'tomorrow' });
    const [stored] = storedTabs(chrome);

    await chrome._test.sendMessage({ action: 'unsnooze-tab', snoozedTabId: stored.id });

    const reopened = chrome._test.tabsWithUrl(tab.url);
    expect(reopened).toHaveLength(1);
    expect(reopened[0].active).toBe(false);
    expect(storedTabs(chrome)).toHaveLength(0);
    expect(chrome._test.alarms.size).toBe(0);
  });

  test('a tab that fails to reopen stays snoozed', async () => {
    await chrome._test.sendMessage({ action: 'snooze-tab', tabId: tab.id, snoozeOption: 'tomorrow' });
    const [stored] = storedTabs(chrome);
    chrome.tabs.create.mockRejectedValueOnce(new Error('Browser is shutting down'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = await chrome._test.sendMessage({ action: 'unsnooze-tab', snoozedTabId: stored.id });

    expect(response.success).toBe(false);
    expect(storedTabs(chrome)).toEqual([stored]);
    console.error.mockRestore();
  });

  test('a firing alarm reopens its tab', async () => {
    await chrome._test.sendMessage({ action: 'snooze-tab', tabId: tab.id, snoozeOption: 'tomorrow' });
    const [stored] = storedTabs(chrome);

    await Promise.all(chrome.alarms.onAlarm.dispatch({ name: `unsnooze_${stored.id}` }));

    expect(chrome._test.tabsWithUrl(tab.url)).toHaveLength(1);
    expect(storedTabs(chrome)).toHaveLength(0);
  });

  test('alarms for already-removed tabs do nothing', async () => {
    await Promise.all(chrome.alarms.onAlarm.dispatch({ name: 'unsnooze_snoozed_missing' }));
    await Promise.all(chrome.alarms.onAlarm.dispatch({ name: 'some-other-alarm' }));

    expect(chrome.tabs.create).not.toHaveBeenCalled();
  });

  test('remove-snoozed-tab forgets the tab without opening it', async () => {
    await chrome._test.sendMessage({ action: 'snooze-tab', tabId: tab.id, snoozeOption: 'tomorrow' });
    const [stored] = storedTabs(chrome);

    const response = await chrome._test.sendMessage({ action: 'remove-snoozed-tab', snoozedTabId: stored.id });

    expect(response).toEqual({ success: true });
    expect(chrome.tabs.create).not.toHaveBeenCalled();
    expect(storedTabs(chrome)).toHaveLength(0);
    expect(chrome._test.alarms.size).toBe(0);
  });

  test('update-snooze-time reschedules the alarm', async () => {
    await chrome._test.sendMessage({ action: 'snooze-tab', tabId: tab.id, snoozeOption: 'later-today' });
    const [stored] = storedTabs(chrome);

    await chrome._test.sendMessage({ action: 'update-snooze-time', snoozedTabId: stored.id, newTime: 'next-month' });

    const [updated] = storedTabs(chrome);
    expect(updated.snoozeOption).toBe('next-month');
    expect(updated.unsnoozeAt).toBeGreaterThan(stored.unsnoozeAt);
    expect(chrome._test.alarms.get(`unsnooze_${stored.id}`).scheduledTime).toBe(updated.unsnoozeAt);
  });

  test('update-snooze-time to "someday" cancels the alarm', async () => {
    await chrome._test.sendMessage({ action: 'snooze-tab', tabId: tab.id, snoozeOption: 'later-today' });
    const [stored] = storedTabs(chrome);

    await chrome._test.sendMessage({ action: 'update-snooze-time', snoozedTabId: stored.id, newTime: 'someday' });

    expect(storedTabs(chrome)[0].snoozeOption).toBe('someday');
    expect(chrome._test.alarms.size).toBe(0);
  });

  test('get-snoozed-tabs returns stored tabs', async () => {
    await chrome._test.sendMessage({ action: 'snooze-tab', tabId: tab.id, snoozeOption: 'tomorrow' });

    const response = await chrome._test.sendMessage({ action: 'get-snoozed-tabs' });

    expect(response.success).toBe(true);
    expect(response.tabs).toHaveLength(1);
  });

  test('unknown actions get an error response', async () => {
    const response = await chrome._test.sendMessage({ action: 'not-a-real-action' });

    expect(response).toEqual({ success: false, error: 'Unknown action' });
  });

  test('the context menu opens the popup', async () => {
    await Promise.all(chrome.contextMenus.onClicked.dispatch({ menuItemId: 'snooze-tab' }, tab));

    expect(chrome.action.openPopup).toHaveBeenCalled();
  });
});
