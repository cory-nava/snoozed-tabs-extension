// Consolidated background script for Snoozed Tabs extension
// All utilities included in one file to avoid module loading issues

// Storage Manager Class
class StorageManager {
  constructor() {
    this.storageKey = 'snoozed_tabs';
  }

  async saveSnoozedTab(snoozedTab) {
    try {
      const existingTabs = await this.getAllSnoozedTabs();
      const updatedTabs = existingTabs.filter(tab => tab.id !== snoozedTab.id);
      updatedTabs.push(snoozedTab);
      
      await chrome.storage.local.set({
        [this.storageKey]: updatedTabs
      });
      
      console.log('Snoozed tab saved:', snoozedTab.title);
    } catch (error) {
      console.error('Error saving snoozed tab:', error);
      throw error;
    }
  }

  async getSnoozedTab(tabId) {
    try {
      const allTabs = await this.getAllSnoozedTabs();
      return allTabs.find(tab => tab.id === tabId);
    } catch (error) {
      console.error('Error getting snoozed tab:', error);
      throw error;
    }
  }

  async getAllSnoozedTabs() {
    try {
      const result = await chrome.storage.local.get([this.storageKey]);
      return result[this.storageKey] || [];
    } catch (error) {
      console.error('Error getting all snoozed tabs:', error);
      throw error;
    }
  }

  async removeSnoozedTab(tabId) {
    try {
      const existingTabs = await this.getAllSnoozedTabs();
      const updatedTabs = existingTabs.filter(tab => tab.id !== tabId);
      
      await chrome.storage.local.set({
        [this.storageKey]: updatedTabs
      });
      
      console.log('Snoozed tab removed:', tabId);
    } catch (error) {
      console.error('Error removing snoozed tab:', error);
      throw error;
    }
  }
}

// Time Calculator Class
class TimeCalculator {
  constructor() {
    this.snoozeOptions = {
      'later-today': '3 hours from now',
      'tonight': '6pm today',
      'tomorrow': '8am tomorrow',
      'later-this-week': '3 days from now',
      'this-weekend': '8am Saturday',
      'next-week': '8am next Monday',
      'couple-weeks': '2 weeks from now',
      'next-month': '30 days from now',
      'someday': 'Indefinitely'
    };
  }

  calculateUnsnoozeTime(snoozeOption) {
    const now = new Date();
    
    switch (snoozeOption) {
      case 'later-today':
        return this.addHours(now, 3).getTime();
        
      case 'tonight':
        return this.setTimeToday(now, 18, 0).getTime(); // 6pm today
        
      case 'tomorrow':
        return this.setTimeTomorrow(now, 8, 0).getTime(); // 8am tomorrow
        
      case 'later-this-week':
        return this.addDays(now, 3).getTime();
        
      case 'this-weekend':
        return this.getNextSaturday(now, 8, 0).getTime(); // 8am Saturday
        
      case 'next-week':
        return this.getNextMonday(now, 8, 0).getTime(); // 8am next Monday
        
      case 'couple-weeks':
        return this.addWeeks(now, 2).getTime();
        
      case 'next-month':
        return this.addDays(now, 30).getTime();
        
      case 'someday':
        return new Date('2099-12-31').getTime(); // Far future date
        
      default:
        return this.addHours(now, 3).getTime();
    }
  }

  addHours(date, hours) {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  addWeeks(date, weeks) {
    return this.addDays(date, weeks * 7);
  }

  setTimeToday(date, hours, minutes) {
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    
    // If the time has already passed today, set it for tomorrow
    if (result <= date) {
      result.setDate(result.getDate() + 1);
    }
    
    return result;
  }

  setTimeTomorrow(date, hours, minutes) {
    const result = new Date(date);
    result.setDate(result.getDate() + 1);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  getNextSaturday(date, hours, minutes) {
    const result = new Date(date);
    const dayOfWeek = result.getDay();
    const daysUntilSaturday = dayOfWeek === 6 ? 7 : 6 - dayOfWeek;
    
    result.setDate(result.getDate() + daysUntilSaturday);
    result.setHours(hours, minutes, 0, 0);
    
    return result;
  }

  getNextMonday(date, hours, minutes) {
    const result = new Date(date);
    const dayOfWeek = result.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    
    result.setDate(result.getDate() + daysUntilMonday);
    result.setHours(hours, minutes, 0, 0);
    
    return result;
  }
}

// Tab Manager Class
class TabManager {
  constructor() {
    this.activeTab = null;
  }

  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.activeTab = tab;
      return tab;
    } catch (error) {
      console.error('Error getting current tab:', error);
      throw error;
    }
  }

  async getTab(tabId) {
    try {
      return await chrome.tabs.get(tabId);
    } catch (error) {
      console.error('Error getting tab:', error);
      throw error;
    }
  }

  async createTab(url, options = {}) {
    try {
      const defaultOptions = {
        url,
        active: false,
        ...options
      };
      
      return await chrome.tabs.create(defaultOptions);
    } catch (error) {
      console.error('Error creating tab:', error);
      throw error;
    }
  }

  async removeTab(tabId) {
    try {
      await chrome.tabs.remove(tabId);
      console.log('Tab removed:', tabId);
    } catch (error) {
      console.error('Error removing tab:', error);
      throw error;
    }
  }
}

// Main Snooze Service
class SnoozeService {
  constructor() {
    this.storage = new StorageManager();
    this.timeCalculator = new TimeCalculator();
    this.tabManager = new TabManager();
    this.init();
  }

  async init() {
    console.log('Snoozed Tabs extension starting...');
    
    // Set up context menu
    chrome.contextMenus.create({
      id: 'snooze-tab',
      title: 'Snooze Tab',
      contexts: ['all']
    });

    // Set up event listeners
    chrome.contextMenus.onClicked.addListener(this.handleContextMenu.bind(this));
    chrome.alarms.onAlarm.addListener(this.handleAlarm.bind(this));
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
    
    // Clean up and restore any tabs that should be unsnoozed
    await this.restoreExpiredTabs();
    
    console.log('Snoozed Tabs extension initialized');
  }

  async handleContextMenu(info, tab) {
    if (info.menuItemId === 'snooze-tab') {
      // Open the popup programmatically
      chrome.action.openPopup();
    }
  }

  async handleMessage(request, sender, sendResponse) {
    console.log('Background received message:', request.action);
    
    try {
      switch (request.action) {
        case 'snooze-tab':
          console.log('Processing snooze-tab request for tab:', request.tabId);
          await this.snoozeTab(request.tabId, request.snoozeOption);
          console.log('Snooze-tab request completed successfully');
          sendResponse({ success: true });
          break;
          
        case 'unsnooze-tab':
          console.log('Processing unsnooze-tab request for tab:', request.snoozedTabId);
          await this.unsnoozeTab(request.snoozedTabId);
          console.log('Unsnooze-tab request completed successfully');
          sendResponse({ success: true });
          break;
          
        case 'get-snoozed-tabs':
          console.log('Processing get-snoozed-tabs request');
          const tabs = await this.getSnoozedTabs();
          console.log('Returning snoozed tabs:', tabs.length);
          sendResponse({ success: true, tabs: tabs });
          break;
          
        case 'update-snooze-time':
          console.log('Processing update-snooze-time request');
          await this.updateSnoozeTime(request.snoozedTabId, request.newTime);
          console.log('Update-snooze-time request completed successfully');
          sendResponse({ success: true });
          break;
          
        default:
          console.log('Unknown action:', request.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async snoozeTab(tabId, snoozeOption) {
    console.log('Snoozing tab:', tabId, snoozeOption);
    
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
    console.log('Unsnoozing tab:', snoozedTabId);
    
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
    } else {
      console.log('Snoozed tab not found:', snoozedTabId);
    }
  }

  async getSnoozedTabs() {
    const tabs = await this.storage.getAllSnoozedTabs();
    console.log('Retrieved snoozed tabs from storage:', tabs.length);
    return tabs;
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
      
      console.log(`Updated snooze time for tab ${snoozedTabId} to ${newSnoozeOption}`);
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
