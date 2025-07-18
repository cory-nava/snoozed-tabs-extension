// Content script for Snoozed Tabs extension
// This script runs in the context of web pages

class SnoozedTabsContent {
  constructor() {
    this.init();
  }

  init() {
    this.setupMessageListeners();
    this.observePageChanges();
  }

  setupMessageListeners() {
    // Listen for messages from the extension
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'get-page-info':
          this.getPageInfo(sendResponse);
          break;
        case 'highlight-tab':
          this.highlightTab();
          break;
        case 'prepare-for-snooze':
          this.prepareForSnooze();
          break;
        default:
          sendResponse({ error: 'Unknown action' });
      }
      return true; // Keep message channel open
    });
  }

  getPageInfo(sendResponse) {
    try {
      const pageInfo = {
        title: document.title,
        url: window.location.href,
        description: this.getPageDescription(),
        keywords: this.getPageKeywords(),
        lastModified: document.lastModified,
        readyState: document.readyState,
        visibilityState: document.visibilityState,
        hasInteractedWithPage: this.hasUserInteracted()
      };

      sendResponse({ pageInfo });
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }

  getPageDescription() {
    const metaDesc = document.querySelector('meta[name="description"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    
    return metaDesc?.content || ogDesc?.content || '';
  }

  getPageKeywords() {
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    return metaKeywords?.content || '';
  }

  hasUserInteracted() {
    // Check if user has scrolled or interacted with the page
    return window.scrollY > 0 || 
           document.querySelector('input:focus') !== null ||
           document.querySelector('textarea:focus') !== null ||
           document.querySelector('[contenteditable="true"]:focus') !== null;
  }

  highlightTab() {
    // Add a subtle visual indicator that this tab will be snoozed
    const indicator = document.createElement('div');
    indicator.id = 'snoozed-tabs-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #3b82f6, #10b981);
      z-index: 999999;
      animation: pulse 1s ease-in-out infinite alternate;
    `;

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 0.5; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(indicator);

    // Remove after 3 seconds
    setTimeout(() => {
      indicator.remove();
      style.remove();
    }, 3000);
  }

  prepareForSnooze() {
    // Save any form data or scroll position before snoozing
    this.saveFormData();
    this.saveScrollPosition();
    
    // Pause any videos or audio
    this.pauseMediaElements();
    
    // Clear any timers or intervals that might be running
    this.clearPageTimers();
  }

  saveFormData() {
    try {
      const formData = {};
      const forms = document.querySelectorAll('form');
      
      forms.forEach((form, index) => {
        const formFields = {};
        const inputs = form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
          if (input.type !== 'password' && input.type !== 'file') {
            formFields[input.name || input.id || `field_${index}`] = input.value;
          }
        });
        
        if (Object.keys(formFields).length > 0) {
          formData[`form_${index}`] = formFields;
        }
      });

      if (Object.keys(formData).length > 0) {
        chrome.storage.local.set({
          [`form_data_${window.location.href}`]: formData
        });
      }
    } catch (error) {
      console.warn('Could not save form data:', error);
    }
  }

  saveScrollPosition() {
    try {
      const scrollData = {
        x: window.scrollX,
        y: window.scrollY,
        timestamp: Date.now()
      };

      chrome.storage.local.set({
        [`scroll_position_${window.location.href}`]: scrollData
      });
    } catch (error) {
      console.warn('Could not save scroll position:', error);
    }
  }

  pauseMediaElements() {
    try {
      // Pause videos
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        if (!video.paused) {
          video.pause();
        }
      });

      // Pause audio
      const audios = document.querySelectorAll('audio');
      audios.forEach(audio => {
        if (!audio.paused) {
          audio.pause();
        }
      });
    } catch (error) {
      console.warn('Could not pause media elements:', error);
    }
  }

  clearPageTimers() {
    try {
      // This is a basic attempt to clear common timers
      // Note: This won't catch all timers, but it's a best effort
      
      // Clear intervals (this is limited and may not work for all cases)
      for (let i = 1; i < 10000; i++) {
        clearInterval(i);
        clearTimeout(i);
      }
    } catch (error) {
      console.warn('Could not clear page timers:', error);
    }
  }

  observePageChanges() {
    // Monitor for dynamic content changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Page content has changed
          this.notifyPageChanged();
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Monitor for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.notifyPageVisible();
      }
    });

    // Monitor for page unload
    window.addEventListener('beforeunload', () => {
      this.notifyPageUnloading();
    });
  }

  // Safe message sending with error handling
  safeSendMessage(message, callback) {
    try {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            // Extension context invalidated - ignore silently
            console.debug('Extension context invalidated, ignoring message:', chrome.runtime.lastError.message);
            return;
          }
          if (callback) {
            callback(response);
          }
        });
      }
    } catch (error) {
      // Extension context invalidated - ignore silently
      console.debug('Extension context invalidated, message not sent:', error.message);
    }
  }

  notifyPageChanged() {
    // Throttle notifications to avoid spam
    if (this.lastNotification && Date.now() - this.lastNotification < 5000) {
      return;
    }

    this.lastNotification = Date.now();
    
    this.safeSendMessage({
      action: 'page-changed',
      url: window.location.href,
      title: document.title,
      timestamp: Date.now()
    });
  }

  notifyPageVisible() {
    this.safeSendMessage({
      action: 'page-visible',
      url: window.location.href,
      timestamp: Date.now()
    });
  }

  notifyPageUnloading() {
    this.safeSendMessage({
      action: 'page-unloading',
      url: window.location.href,
      timestamp: Date.now()
    });
  }

  // Utility methods
  isPageInteractive() {
    return document.readyState === 'interactive' || document.readyState === 'complete';
  }

  getPageLoadTime() {
    if (window.performance && window.performance.timing) {
      return window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
    }
    return null;
  }

  getPageSize() {
    return {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight
    };
  }

  hasUnsavedChanges() {
    // Check for unsaved form data
    const forms = document.querySelectorAll('form');
    for (let form of forms) {
      const inputs = form.querySelectorAll('input, textarea, select');
      for (let input of inputs) {
        if (input.value && input.value !== input.defaultValue) {
          return true;
        }
      }
    }

    // Check for contentEditable elements
    const editables = document.querySelectorAll('[contenteditable="true"]');
    for (let editable of editables) {
      if (editable.textContent && editable.textContent.trim() !== '') {
        return true;
      }
    }

    return false;
  }
}

// Initialize content script when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new SnoozedTabsContent();
  });
} else {
  new SnoozedTabsContent();
}

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SnoozedTabsContent;
}