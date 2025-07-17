export class StorageManager {
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

  async clearAllSnoozedTabs() {
    try {
      await chrome.storage.local.set({
        [this.storageKey]: []
      });
      
      console.log('All snoozed tabs cleared');
    } catch (error) {
      console.error('Error clearing all snoozed tabs:', error);
      throw error;
    }
  }

  async getSnoozedTabsCount() {
    try {
      const allTabs = await this.getAllSnoozedTabs();
      return allTabs.length;
    } catch (error) {
      console.error('Error getting snoozed tabs count:', error);
      return 0;
    }
  }

  async getSnoozedTabsByTimeRange(startTime, endTime) {
    try {
      const allTabs = await this.getAllSnoozedTabs();
      return allTabs.filter(tab => 
        tab.unsnoozeAt >= startTime && tab.unsnoozeAt <= endTime
      );
    } catch (error) {
      console.error('Error getting snoozed tabs by time range:', error);
      return [];
    }
  }

  async getOverdueTabs() {
    try {
      const allTabs = await this.getAllSnoozedTabs();
      const now = Date.now();
      return allTabs.filter(tab => 
        tab.unsnoozeAt <= now && tab.snoozeOption !== 'someday'
      );
    } catch (error) {
      console.error('Error getting overdue tabs:', error);
      return [];
    }
  }

  async updateSnoozedTab(tabId, updates) {
    try {
      const existingTabs = await this.getAllSnoozedTabs();
      const tabIndex = existingTabs.findIndex(tab => tab.id === tabId);
      
      if (tabIndex !== -1) {
        existingTabs[tabIndex] = { ...existingTabs[tabIndex], ...updates };
        
        await chrome.storage.local.set({
          [this.storageKey]: existingTabs
        });
        
        console.log('Snoozed tab updated:', tabId);
        return existingTabs[tabIndex];
      }
      
      return null;
    } catch (error) {
      console.error('Error updating snoozed tab:', error);
      throw error;
    }
  }

  async exportSnoozedTabs() {
    try {
      const allTabs = await this.getAllSnoozedTabs();
      return JSON.stringify(allTabs, null, 2);
    } catch (error) {
      console.error('Error exporting snoozed tabs:', error);
      throw error;
    }
  }

  async importSnoozedTabs(jsonData) {
    try {
      const importedTabs = JSON.parse(jsonData);
      
      // Validate the imported data
      if (!Array.isArray(importedTabs)) {
        throw new Error('Invalid import data format');
      }
      
      // Merge with existing tabs (avoid duplicates)
      const existingTabs = await this.getAllSnoozedTabs();
      const existingIds = new Set(existingTabs.map(tab => tab.id));
      
      const newTabs = importedTabs.filter(tab => 
        tab.id && tab.url && tab.title && !existingIds.has(tab.id)
      );
      
      const allTabs = [...existingTabs, ...newTabs];
      
      await chrome.storage.local.set({
        [this.storageKey]: allTabs
      });
      
      console.log(`Imported ${newTabs.length} snoozed tabs`);
      return newTabs.length;
    } catch (error) {
      console.error('Error importing snoozed tabs:', error);
      throw error;
    }
  }

  // Listen for storage changes
  onStorageChanged(callback) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes[this.storageKey]) {
        callback(changes[this.storageKey].newValue || []);
      }
    });
  }
}
