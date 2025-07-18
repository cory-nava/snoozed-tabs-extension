class PopupManager {
  constructor() {
    this.currentTab = null;
    this.snoozedTabs = [];
    this.currentEditingTab = null;
    this.init();
  }

  async init() {
    await this.loadCurrentTab();
    await this.loadSnoozedTabs();
    this.setupEventListeners();
    this.updateUI();
  }

  async loadCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
      console.log('Current tab loaded:', tab.title);
    } catch (error) {
      console.error('Error loading current tab:', error);
      this.showToast('Error loading current tab', 'error');
    }
  }

  async loadSnoozedTabs() {
    try {
      console.log('Sending get-snoozed-tabs message to background...');
      
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'get-snoozed-tabs'
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
      
      console.log('Received response from background:', response);
      
      if (response && response.tabs) {
        this.snoozedTabs = response.tabs;
        console.log('Loaded snoozed tabs:', this.snoozedTabs.length);
      } else if (response && response.error) {
        console.error('Background script error:', response.error);
        this.showToast('Background error: ' + response.error, 'error');
      } else {
        console.log('No snoozed tabs found or invalid response');
        this.snoozedTabs = [];
      }
    } catch (error) {
      console.error('Error loading snoozed tabs:', error);
      this.showToast('Error loading snoozed tabs', 'error');
      this.snoozedTabs = [];
    }
  }

  setupEventListeners() {
    // Navigation buttons
    document.getElementById('view-snoozed-btn').addEventListener('click', () => {
      this.showSnoozedList();
    });

    document.getElementById('back-btn').addEventListener('click', () => {
      this.showSnoozeSection();
    });

    // Snooze buttons
    document.querySelectorAll('.snooze-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const option = e.currentTarget.dataset.option;
        this.snoozeCurrentTab(option);
      });
    });

    // Edit snooze buttons
    document.querySelectorAll('.edit-snooze-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const option = e.currentTarget.dataset.option;
        this.updateSnoozeTime(option);
      });
    });

    // Clear all button - now shows confirmation modal
    document.getElementById('clear-all-btn').addEventListener('click', () => {
      this.showClearAllConfirmation();
    });

    // Clear all confirmation modal buttons
    document.getElementById('confirm-clear-btn').addEventListener('click', () => {
      this.clearAllSnoozedTabs();
    });

    document.getElementById('cancel-clear-btn').addEventListener('click', () => {
      this.hideClearAllConfirmation();
    });

    document.getElementById('close-clear-modal').addEventListener('click', () => {
      this.hideClearAllConfirmation();
    });

    // Modal controls
    document.getElementById('close-modal').addEventListener('click', () => {
      this.closeModal();
    });

    // Click outside modal to close
    document.getElementById('edit-modal').addEventListener('click', (e) => {
      if (e.target.id === 'edit-modal') {
        this.closeModal();
      }
    });

    // Click outside clear all modal to close
    document.getElementById('clear-all-modal').addEventListener('click', (e) => {
      if (e.target.id === 'clear-all-modal') {
        this.hideClearAllConfirmation();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
        this.hideClearAllConfirmation();
      }
    });
  }

  updateUI() {
    this.updateCurrentTabInfo();
    this.updateSnoozedTabsList();
  }

  updateCurrentTabInfo() {
    if (!this.currentTab) return;

    const favicon = document.getElementById('tab-favicon');
    const title = document.getElementById('tab-title');
    const url = document.getElementById('tab-url');

    favicon.src = this.currentTab.favIconUrl || '/icons/default-favicon.png';
    favicon.onerror = () => {
      favicon.src = '/icons/default-favicon.png';
    };

    title.textContent = this.currentTab.title || 'Untitled Tab';
    url.textContent = this.getDomain(this.currentTab.url);
  }

  updateSnoozedTabsList() {
    const container = document.getElementById('snoozed-tabs-container');
    const emptyState = document.getElementById('empty-state');

    // Clear existing snoozed tab items first
    container.querySelectorAll('.snoozed-tab-item').forEach(item => item.remove());

    if (this.snoozedTabs.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    // Hide empty state when there are snoozed tabs
    emptyState.classList.add('hidden');

    // Sort tabs by unsnooze time
    const sortedTabs = [...this.snoozedTabs].sort((a, b) => {
      if (a.snoozeOption === 'someday' && b.snoozeOption !== 'someday') return 1;
      if (a.snoozeOption !== 'someday' && b.snoozeOption === 'someday') return -1;
      return a.unsnoozeAt - b.unsnoozeAt;
    });

    // Add snoozed tabs
    sortedTabs.forEach(tab => {
      const tabElement = this.createSnoozedTabElement(tab);
      container.appendChild(tabElement);
    });
  }

  createSnoozedTabElement(tab) {
    const div = document.createElement('div');
    div.className = 'snoozed-tab-item';
    div.dataset.tabId = tab.id;

    const unsnoozeTimeText = this.formatUnsnoozeTime(tab.unsnoozeAt);
    const timeUntilText = this.getTimeUntilUnsnooze(tab.unsnoozeAt);

    div.innerHTML = `
      <img class="favicon" src="${tab.favIconUrl || '/icons/default-favicon.png'}" alt="">
      <div class="snoozed-tab-content">
        <div class="snooze-time">${unsnoozeTimeText} (${timeUntilText})</div>
        <div class="tab-title">${tab.title || 'Untitled Tab'}</div>
        <div class="tab-url">${this.getDomain(tab.url)}</div>
      </div>
      <div class="snoozed-tab-actions">
        <button class="action-btn edit" title="Edit snooze time">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="m18.5 2.5-2.5 2.5-6 6v3h3l6-6 2.5-2.5a2 2 0 0 0 0-3 2 2 0 0 0-3 0z"></path>
          </svg>
        </button>
        <button class="action-btn unsnooze" title="Unsnooze now">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20m8-10H4"/>
          </svg>
        </button>
        <button class="action-btn remove" title="Remove permanently">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;

    // Add click handler to entire tab item to unsnooze
    div.addEventListener('click', (e) => {
      // Only trigger if clicking on the main area, not on action buttons
      if (!e.target.closest('.snoozed-tab-actions')) {
        this.unsnoozeTab(tab.id);
      }
    });

    // Add visual feedback for clickable area
    div.style.cursor = 'pointer';

    // Add event listeners for action buttons
    const editBtn = div.querySelector('.edit');
    const unsnoozeBtn = div.querySelector('.unsnooze');
    const removeBtn = div.querySelector('.remove');

    // Stop propagation on action buttons to prevent tab opening
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.editSnoozeTime(tab);
    });

    unsnoozeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.unsnoozeTab(tab.id);
    });

    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeSnoozedTab(tab.id);
    });

    // Handle favicon error
    const favicon = div.querySelector('.favicon');
    favicon.onerror = () => {
      favicon.src = '/icons/default-favicon.png';
    };

    return div;
  }

  async snoozeCurrentTab(option) {
    if (!this.currentTab) {
      this.showToast('No current tab found', 'error');
      return;
    }

    this.showLoading();
    console.log('Snoozing current tab:', this.currentTab.title, 'with option:', option);

    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'snooze-tab',
          tabId: this.currentTab.id,
          snoozeOption: option
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });

      console.log('Snooze response:', response);

      if (response && response.success) {
        this.showToast('Tab snoozed successfully', 'success');
        window.close();
      } else if (response && response.error) {
        this.showToast('Failed to snooze tab: ' + response.error, 'error');
      } else {
        this.showToast('Failed to snooze tab: Unknown error', 'error');
      }
    } catch (error) {
      console.error('Error snoozing tab:', error);
      this.showToast('Error snoozing tab: ' + error.message, 'error');
    } finally {
      this.hideLoading();
    }
  }

  async unsnoozeTab(tabId) {
    this.showLoading();
    console.log('Unsnoozing tab:', tabId);

    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'unsnooze-tab',
          snoozedTabId: tabId
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });

      console.log('Unsnooze response:', response);

      if (response && response.success) {
        this.showToast('Tab unsnoozed successfully', 'success');
        await this.loadSnoozedTabs();
        this.updateSnoozedTabsList();
      } else if (response && response.error) {
        this.showToast('Failed to unsnooze tab: ' + response.error, 'error');
      } else {
        this.showToast('Failed to unsnooze tab: Unknown error', 'error');
      }
    } catch (error) {
      console.error('Error unsnoozing tab:', error);
      this.showToast('Error unsnoozing tab: ' + error.message, 'error');
    } finally {
      this.hideLoading();
    }
  }

  async removeSnoozedTab(tabId) {
    this.showLoading();

    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'unsnooze-tab',
          snoozedTabId: tabId
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });

      if (response && response.success) {
        this.showToast('Tab removed successfully', 'success');
        await this.loadSnoozedTabs();
        this.updateSnoozedTabsList();
      } else if (response && response.error) {
        this.showToast('Failed to remove tab: ' + response.error, 'error');
      } else {
        this.showToast('Failed to remove tab: Unknown error', 'error');
      }
    } catch (error) {
      console.error('Error removing tab:', error);
      this.showToast('Error removing tab: ' + error.message, 'error');
    } finally {
      this.hideLoading();
    }
  }

  editSnoozeTime(tab) {
    this.currentEditingTab = tab;
    this.showEditModal(tab);
  }

  showEditModal(tab) {
    const modal = document.getElementById('edit-modal');
    const favicon = document.getElementById('modal-favicon');
    const title = document.getElementById('modal-title');
    const url = document.getElementById('modal-url');

    favicon.src = tab.favIconUrl || '/icons/default-favicon.png';
    favicon.onerror = () => {
      favicon.src = '/icons/default-favicon.png';
    };

    title.textContent = tab.title || 'Untitled Tab';
    url.textContent = this.getDomain(tab.url);

    modal.classList.remove('hidden');
  }

  closeModal() {
    document.getElementById('edit-modal').classList.add('hidden');
    this.currentEditingTab = null;
  }

  showClearAllConfirmation() {
    if (this.snoozedTabs.length === 0) {
      this.showToast('No snoozed tabs to clear', 'info');
      return;
    }
    document.getElementById('clear-all-modal').classList.remove('hidden');
  }

  hideClearAllConfirmation() {
    document.getElementById('clear-all-modal').classList.add('hidden');
  }

  async updateSnoozeTime(option) {
    if (!this.currentEditingTab) return;

    this.showLoading();

    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'update-snooze-time',
          snoozedTabId: this.currentEditingTab.id,
          newTime: option
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });

      if (response && response.success) {
        this.showToast('Snooze time updated successfully', 'success');
        this.closeModal();
        await this.loadSnoozedTabs();
        this.updateSnoozedTabsList();
      } else if (response && response.error) {
        this.showToast('Failed to update snooze time: ' + response.error, 'error');
      } else {
        this.showToast('Failed to update snooze time: Unknown error', 'error');
      }
    } catch (error) {
      console.error('Error updating snooze time:', error);
      this.showToast('Error updating snooze time: ' + error.message, 'error');
    } finally {
      this.hideLoading();
    }
  }

  async clearAllSnoozedTabs() {
    this.hideClearAllConfirmation();
    this.showLoading();

    try {
      const clearPromises = this.snoozedTabs.map(tab =>
        new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: 'unsnooze-tab',
            snoozedTabId: tab.id
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          });
        })
      );

      await Promise.all(clearPromises);
      this.showToast('All snoozed tabs cleared', 'success');
      await this.loadSnoozedTabs();
      this.updateSnoozedTabsList();
    } catch (error) {
      console.error('Error clearing all tabs:', error);
      this.showToast('Error clearing all tabs: ' + error.message, 'error');
    } finally {
      this.hideLoading();
    }
  }

  showSnoozeSection() {
    document.getElementById('snooze-section').classList.remove('hidden');
    document.getElementById('snoozed-list-section').classList.add('hidden');
  }

  showSnoozedList() {
    document.getElementById('snooze-section').classList.add('hidden');
    document.getElementById('snoozed-list-section').classList.remove('hidden');
  }

  showLoading() {
    document.getElementById('loading').classList.remove('hidden');
  }

  hideLoading() {
    document.getElementById('loading').classList.add('hidden');
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // Utility methods
  getDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return 'Unknown';
    }
  }

  formatUnsnoozeTime(timestamp) {
    if (timestamp === new Date('2099-12-31').getTime()) {
      return 'Someday';
    }

    const date = new Date(timestamp);
    const now = new Date();

    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();

    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  getTimeUntilUnsnooze(timestamp) {
    const now = Date.now();
    const diff = timestamp - now;

    if (diff <= 0) return 'Overdue';

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});