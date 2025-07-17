export class TabManager {
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

  async updateTab(tabId, updateProperties) {
    try {
      return await chrome.tabs.update(tabId, updateProperties);
    } catch (error) {
      console.error('Error updating tab:', error);
      throw error;
    }
  }

  async getAllTabs() {
    try {
      return await chrome.tabs.query({});
    } catch (error) {
      console.error('Error getting all tabs:', error);
      throw error;
    }
  }

  async getTabsInCurrentWindow() {
    try {
      return await chrome.tabs.query({ currentWindow: true });
    } catch (error) {
      console.error('Error getting tabs in current window:', error);
      throw error;
    }
  }

  async focusTab(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      await chrome.windows.update(tab.windowId, { focused: true });
      await chrome.tabs.update(tabId, { active: true });
    } catch (error) {
      console.error('Error focusing tab:', error);
      throw error;
    }
  }

  async duplicateTab(tabId) {
    try {
      return await chrome.tabs.duplicate(tabId);
    } catch (error) {
      console.error('Error duplicating tab:', error);
      throw error;
    }
  }

  async pinTab(tabId, pinned = true) {
    try {
      return await chrome.tabs.update(tabId, { pinned });
    } catch (error) {
      console.error('Error pinning tab:', error);
      throw error;
    }
  }

  async muteTab(tabId, muted = true) {
    try {
      return await chrome.tabs.update(tabId, { muted });
    } catch (error) {
      console.error('Error muting tab:', error);
      throw error;
    }
  }

  async reloadTab(tabId) {
    try {
      return await chrome.tabs.reload(tabId);
    } catch (error) {
      console.error('Error reloading tab:', error);
      throw error;
    }
  }

  async moveTab(tabId, moveProperties) {
    try {
      return await chrome.tabs.move(tabId, moveProperties);
    } catch (error) {
      console.error('Error moving tab:', error);
      throw error;
    }
  }

  async captureTab(tabId) {
    try {
      return await chrome.tabs.captureVisibleTab(tabId);
    } catch (error) {
      console.error('Error capturing tab:', error);
      throw error;
    }
  }

  async detectLanguage(tabId) {
    try {
      return await chrome.tabs.detectLanguage(tabId);
    } catch (error) {
      console.error('Error detecting language:', error);
      throw error;
    }
  }

  async executeScript(tabId, script) {
    try {
      return await chrome.tabs.executeScript(tabId, script);
    } catch (error) {
      console.error('Error executing script:', error);
      throw error;
    }
  }

  async insertCSS(tabId, css) {
    try {
      return await chrome.tabs.insertCSS(tabId, css);
    } catch (error) {
      console.error('Error inserting CSS:', error);
      throw error;
    }
  }

  async sendMessage(tabId, message) {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      console.error('Error sending message to tab:', error);
      throw error;
    }
  }

  // Utility methods
  isValidUrl(url) {
    try {
      new URL(url);
      return !url.startsWith('chrome://') && 
             !url.startsWith('chrome-extension://') && 
             !url.startsWith('edge://') && 
             !url.startsWith('about:');
    } catch {
      return false;
    }
  }

  getDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return 'Unknown';
    }
  }

  getTabTitle(tab) {
    return tab.title || this.getDomain(tab.url);
  }

  getTabIcon(tab) {
    return tab.favIconUrl || '/icons/default-favicon.png';
  }

  isTabAudible(tab) {
    return tab.audible || false;
  }

  isTabPinned(tab) {
    return tab.pinned || false;
  }

  isTabMuted(tab) {
    return tab.mutedInfo && tab.mutedInfo.muted;
  }

  getTabStatus(tab) {
    return tab.status || 'unknown';
  }

  // Event listeners
  onTabCreated(callback) {
    chrome.tabs.onCreated.addListener(callback);
  }

  onTabUpdated(callback) {
    chrome.tabs.onUpdated.addListener(callback);
  }

  onTabRemoved(callback) {
    chrome.tabs.onRemoved.addListener(callback);
  }

  onTabActivated(callback) {
    chrome.tabs.onActivated.addListener(callback);
  }

  onTabMoved(callback) {
    chrome.tabs.onMoved.addListener(callback);
  }

  onTabAttached(callback) {
    chrome.tabs.onAttached.addListener(callback);
  }

  onTabDetached(callback) {
    chrome.tabs.onDetached.addListener(callback);
  }

  onTabReplaced(callback) {
    chrome.tabs.onReplaced.addListener(callback);
  }
}
