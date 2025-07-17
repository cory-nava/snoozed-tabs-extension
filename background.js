import { StorageManager } from './utils/storage.js';
import { TimeCalculator } from './utils/time.js';
import { TabManager } from './utils/tabManager.js';

class SnoozeService {
  constructor() {
    this.storage = new StorageManager();
    this.timeCalculator = new TimeCalculator();
    this.tabManager = new TabManager();
    this.init();
  }

  async init() {
    // Set up context menu
    chrome.contextMenus.create({
      id: 'snooze-tab',
      title: 'Snooze Tab',
      contexts: ['all']
    });

    // Set up event listeners
    chrome.contextMenus.onClicked.addListener(this.handleContextMenu.bind(this));
    chrome.alarms.onAlarm.addListener(this.handleAlarm.bind(this));
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Clean up and restore any tabs that should be unsnoozed
    await this.restoreExpiredTabs();
  }

  async handleContextMenu(info, tab) {
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
          
        case 'get-snoozed-tabs':
          const tabs = await this.getSnoozedTabs();
          sendResponse({ tabs });
          break;
          
        case 'update-snooze-time':
          await this.updateSnoozeTime(request.snoozedTabId, request.newTime);
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
    
    return true; // Keep message channel open for async response
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
    
    console.log(`Tab snoozed until: ${new Date(unsnoozeTime)}`);
  }

  async unsnoozeTab(snoozedTabId) {
    const snoozedTab = await this.storage.getSnoozedTab(snoozedTabId);
    
    if (snoozedTab) {
      // Create new tab
      const newTab = await chrome.tabs.create({
        url: snoozedTab.url,
        active: false
      });
      
      // Remove from storage
      await this.storage.removeSnoozedTab(snoozedTabId);
      
      // Clear alarm
      chrome.alarms.clear(`unsnooze_${snoozedTabId}`);
      
      console.log(`Tab unsnoozed: ${snoozedTab.title}`);
      
      return newTab;
    }
  }

  async getSnoozedTabs() {
    return await this.storage.getAllSnoozedTabs();
  }

  async updateSnoozeTime(snoozedTabId, newSnoozeOption) {
    const snoozedTab = await this.storage.getSnoozedTab(snoozedTabId);
    
    if (snoozedTab) {
      const newUnsnoozeTime = this.timeCalculator.calculateUnsnoozeTime(newSnoozeOption);
      
      // Update the snoozed tab
      snoozedTab.snoozeOption = newSnoozeOption;
      snoozedTab.unsnoozeAt = newUnsnoozeTime;
      
      await this.storage.saveSnoozedTab(snoozedTab);
      
      // Clear old alarm and set new one
      chrome.alarms.clear(`unsnooze_${snoozedTabId}`);
      
      if (newSnoozeOption !== 'someday') {
        chrome.alarms.create(`unsnooze_${snoozedTabId}`, {
          when: newUnsnoozeTime
        });
      }
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

// Initialize the service
new SnoozeService();
