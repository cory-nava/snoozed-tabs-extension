/**
 * @jest-environment jsdom
 */
import fs from 'fs';
import path from 'path';
import { PopupManager } from '../popup/popup.js';
import { SOMEDAY_TIMESTAMP } from '../utils/time.js';

const HOUR = 60 * 60 * 1000;
const popupHtml = fs.readFileSync(path.join(__dirname, '../popup/popup.html'), 'utf8');

const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise(resolve => setTimeout(resolve, 0));
};

// Renders the popup against a fake background that answers with `snoozedTabs`.
async function renderPopup(snoozedTabs = []) {
  // jsdom doesn't run scripts by default, so popup.html's own <script> tag stays inert
  document.documentElement.innerHTML = popupHtml;
  const sent = [];
  global.chrome = {
    runtime: {
      lastError: undefined,
      sendMessage: jest.fn((message, callback) => {
        sent.push(message);
        callback(message.action === 'get-snoozed-tabs'
          ? { success: true, tabs: snoozedTabs }
          : { success: true });
      })
    },
    tabs: {
      query: jest.fn(async () => [{ id: 5, title: 'Current page', url: 'https://current.example/' }])
    }
  };
  window.close = jest.fn();
  const popup = new PopupManager();
  await flush();
  return { popup, sent };
}

function entry(overrides) {
  return {
    id: 'snoozed_1_1',
    url: 'https://example.com/page',
    title: 'Example page',
    favIconUrl: '',
    snoozeOption: 'tomorrow',
    unsnoozeAt: Date.now() + 5 * HOUR,
    ...overrides
  };
}

const items = () => [...document.querySelectorAll('.snoozed-tab-item')];

afterEach(() => {
  delete global.chrome;
});

test('shows the empty state when nothing is snoozed', async () => {
  await renderPopup([]);

  expect(document.getElementById('empty-state').textContent).toContain('No snoozed tabs');
});

test('lists snoozed tabs soonest first with "someday" tabs last', async () => {
  await renderPopup([
    entry({ id: 'c', title: 'Someday tab', snoozeOption: 'someday', unsnoozeAt: SOMEDAY_TIMESTAMP }),
    entry({ id: 'b', title: 'Later tab', unsnoozeAt: Date.now() + 48 * HOUR }),
    entry({ id: 'a', title: 'Soon tab', unsnoozeAt: Date.now() + 2 * HOUR })
  ]);

  expect(items().map(el => el.querySelector('.tab-title').textContent))
    .toEqual(['Soon tab', 'Later tab', 'Someday tab']);
});

test('"someday" tabs are labelled "Someday" with no countdown', async () => {
  await renderPopup([entry({ snoozeOption: 'someday', unsnoozeAt: SOMEDAY_TIMESTAMP })]);

  expect(items()[0].querySelector('.snooze-time').textContent).toBe('Someday');
});

test('timed tabs show when they return and how long until then', async () => {
  await renderPopup([entry({ unsnoozeAt: Date.now() + 49 * HOUR })]);

  expect(items()[0].querySelector('.snooze-time').textContent).toMatch(/\(2 days\)$/);
  expect(items()[0].querySelector('.tab-url').textContent).toBe('example.com');
});

test('page titles containing HTML are shown as text, not rendered', async () => {
  const title = '<img src=x onerror="alert(1)"><b>Bold</b>';
  await renderPopup([entry({ title, favIconUrl: '"><script>alert(1)</script>' })]);

  const item = items()[0];
  expect(item.querySelector('.tab-title').textContent).toBe(title);
  expect(item.querySelector('b')).toBeNull();
  expect(item.querySelectorAll('img')).toHaveLength(1);
  expect(item.querySelector('script')).toBeNull();
});

test('clicking a snooze option sends the current tab to the background and closes the popup', async () => {
  const { sent } = await renderPopup();

  document.querySelector('.snooze-btn[data-option="this-weekend"]').click();
  await flush();

  expect(sent).toContainEqual({ action: 'snooze-tab', tabId: 5, snoozeOption: 'this-weekend' });
  expect(window.close).toHaveBeenCalled();
});

test('the remove button forgets a tab without unsnoozing it', async () => {
  const { sent } = await renderPopup([entry({ id: 'snoozed_9_9' })]);

  items()[0].querySelector('.remove').click();
  await flush();

  expect(sent).toContainEqual({ action: 'remove-snoozed-tab', snoozedTabId: 'snoozed_9_9' });
  expect(sent.some(m => m.action === 'unsnooze-tab')).toBe(false);
});

test('clicking a listed tab unsnoozes it', async () => {
  const { sent } = await renderPopup([entry({ id: 'snoozed_9_9' })]);

  items()[0].querySelector('.tab-title').click();
  await flush();

  expect(sent).toContainEqual({ action: 'unsnooze-tab', snoozedTabId: 'snoozed_9_9' });
});

test('editing a tab sends the new snooze time', async () => {
  const { sent } = await renderPopup([entry({ id: 'snoozed_9_9' })]);

  items()[0].querySelector('.edit').click();
  expect(document.getElementById('edit-modal').classList.contains('hidden')).toBe(false);
  document.querySelector('.edit-snooze-btn[data-option="next-month"]').click();
  await flush();

  expect(sent).toContainEqual({ action: 'update-snooze-time', snoozedTabId: 'snoozed_9_9', newTime: 'next-month' });
  expect(document.getElementById('edit-modal').classList.contains('hidden')).toBe(true);
});

test('"Clear All" asks for confirmation, then removes every tab', async () => {
  const { sent } = await renderPopup([entry({ id: 'a' }), entry({ id: 'b' })]);

  document.getElementById('clear-all-btn').click();
  expect(document.getElementById('clear-all-modal').classList.contains('hidden')).toBe(false);
  expect(sent.some(m => m.action === 'remove-snoozed-tab')).toBe(false);

  document.getElementById('confirm-clear-btn').click();
  await flush();

  const removed = sent.filter(m => m.action === 'remove-snoozed-tab').map(m => m.snoozedTabId);
  expect(removed.sort()).toEqual(['a', 'b']);
});

test('a background error is shown to the user', async () => {
  await renderPopup();
  chrome.runtime.sendMessage.mockImplementation((message, callback) => {
    callback({ success: false, error: 'No tab with id: 5.' });
  });

  document.querySelector('.snooze-btn[data-option="tomorrow"]').click();
  await flush();

  expect(document.getElementById('toast-container').textContent).toContain('No tab with id: 5.');
  expect(window.close).not.toHaveBeenCalled();
});
