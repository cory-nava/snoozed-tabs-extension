import { StorageManager } from '../utils/storage.js';
import { TimeCalculator } from '../utils/time.js';

export class SnoozeService {
  constructor() {
    this.storage = new StorageManager();
    this.timeCalculator = new TimeCalculator();
  }

  // Runs every time Chrome starts the service worker, which happens often in MV3.
  async start() {
    // Context menus persist across worker restarts, so only create them on install/update
    chrome.runtime.onInstalled.addListener(() => {
      chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
          id: 'snooze-tab',
          title: 'Snooze Tab',
          contexts: ['all']
        });
      });
    });

    // Listening for onStartup makes Chrome start the worker at browser launch, so tabs
    // that came due while Chrome was closed reopen right away
    chrome.runtime.onStartup.addListener(() => this.restoreExpiredTabs());

    chrome.contextMenus.onClicked.addListener(this.handleContextMenu.bind(this));
    chrome.alarms.onAlarm.addListener(this.handleAlarm.bind(this));
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Restore tabs whose alarms were missed while the browser was closed
    await this.restoreExpiredTabs();
  }

  async handleContextMenu(info) {
    if (info.menuItemId === 'snooze-tab') {
      // Open the popup programmatically
      chrome.action.openPopup();
    }
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'snooze-tab':
          await this.snoozeTab(request.tabId, request.snoozeOption);
          sendResponse({ success: true });
          break;

        case 'unsnooze-tab':
          await this.unsnoozeTab(request.snoozedTabId);
          sendResponse({ success: true });
          break;

        case 'remove-snoozed-tab':
          await this.removeSnoozedTab(request.snoozedTabId);
          sendResponse({ success: true });
          break;

        case 'get-snoozed-tabs':
          sendResponse({ success: true, tabs: await this.getSnoozedTabs() });
          break;

        case 'update-snooze-time':
          await this.updateSnoozeTime(request.snoozedTabId, request.newTime);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async snoozeTab(tabId, snoozeOption) {
    const tab = await chrome.tabs.get(tabId);
    const unsnoozeTime = this.timeCalculator.calculateUnsnoozeTime(snoozeOption);

    const snoozedTab = {
      id: `snoozed_${Date.now()}_${tabId}`,
      originalTabId: tabId,
      url: tab.url,
      title: tab.title,
      favIconUrl: tab.favIconUrl,
      snoozeOption,
      snoozedAt: Date.now(),
      unsnoozeAt: unsnoozeTime,
      windowId: tab.windowId
    };

    // Store the snoozed tab
    await this.storage.saveSnoozedTab(snoozedTab);

    // Set up alarm if not indefinite
    if (snoozeOption !== 'someday') {
      chrome.alarms.create(`unsnooze_${snoozedTab.id}`, {
        when: unsnoozeTime
      });
    }

    // Close the original tab
    await chrome.tabs.remove(tabId);
  }

  // The alarm, startup restore, and the popup can all ask to unsnooze the same tab at
  // once. Removing the entry first claims it, so only the caller that removed it opens it.
  async unsnoozeTab(snoozedTabId) {
    const snoozedTab = await this.storage.removeSnoozedTab(snoozedTabId);
    if (!snoozedTab) return;

    chrome.alarms.clear(`unsnooze_${snoozedTabId}`);

    try {
      return await chrome.tabs.create({
        url: snoozedTab.url,
        active: false
      });
    } catch (error) {
      // Don't lose the tab if it couldn't be reopened
      await this.storage.saveSnoozedTab(snoozedTab);
      throw error;
    }
  }

  async removeSnoozedTab(snoozedTabId) {
    await this.storage.removeSnoozedTab(snoozedTabId);
    chrome.alarms.clear(`unsnooze_${snoozedTabId}`);
  }

  async getSnoozedTabs() {
    return this.storage.getAllSnoozedTabs();
  }

  async updateSnoozeTime(snoozedTabId, newSnoozeOption) {
    const newUnsnoozeTime = this.timeCalculator.calculateUnsnoozeTime(newSnoozeOption);
    const updated = await this.storage.updateSnoozedTab(snoozedTabId, {
      snoozeOption: newSnoozeOption,
      unsnoozeAt: newUnsnoozeTime
    });

    // The tab may have been unsnoozed while the edit dialog was open
    if (!updated) return;

    // Clear old alarm and set new one
    chrome.alarms.clear(`unsnooze_${snoozedTabId}`);

    if (newSnoozeOption !== 'someday') {
      chrome.alarms.create(`unsnooze_${snoozedTabId}`, {
        when: newUnsnoozeTime
      });
    }
  }

  async handleAlarm(alarm) {
    if (alarm.name.startsWith('unsnooze_')) {
      const snoozedTabId = alarm.name.replace('unsnooze_', '');
      await this.unsnoozeTab(snoozedTabId);
    }
  }

  async restoreExpiredTabs() {
    const snoozedTabs = await this.storage.getAllSnoozedTabs();
    const now = Date.now();

    for (const snoozedTab of snoozedTabs) {
      if (snoozedTab.unsnoozeAt <= now && snoozedTab.snoozeOption !== 'someday') {
        await this.unsnoozeTab(snoozedTab.id);
      }
    }
  }
}
