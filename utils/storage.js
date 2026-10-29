// Every read-modify-write of the snoozed list goes through this queue. Without it,
// two overlapping writers (an alarm and startup restore, or parallel "Clear All"
// removes) each read the same list and the last write wins.
let writeQueue = Promise.resolve();

function serialize(task) {
  const run = writeQueue.then(task);
  writeQueue = run.catch(() => {});
  return run;
}

export class StorageManager {
  constructor() {
    this.storageKey = 'snoozed_tabs';
  }

  async getAllSnoozedTabs() {
    const result = await chrome.storage.local.get([this.storageKey]);
    return result[this.storageKey] || [];
  }

  async getSnoozedTab(tabId) {
    const allTabs = await this.getAllSnoozedTabs();
    return allTabs.find(tab => tab.id === tabId);
  }

  // Applies `change` to the stored list atomically and returns its `result`.
  mutate(change) {
    return serialize(async () => {
      const { tabs, result } = change(await this.getAllSnoozedTabs());
      await chrome.storage.local.set({ [this.storageKey]: tabs });
      return result;
    });
  }

  saveSnoozedTab(snoozedTab) {
    return this.mutate(tabs => ({
      tabs: [...tabs.filter(tab => tab.id !== snoozedTab.id), snoozedTab]
    }));
  }

  // Returns the merged entry, or null if it no longer exists.
  updateSnoozedTab(tabId, updates) {
    return this.mutate(tabs => {
      const existing = tabs.find(tab => tab.id === tabId);
      if (!existing) return { tabs, result: null };
      const updated = { ...existing, ...updates };
      return { tabs: tabs.map(tab => (tab.id === tabId ? updated : tab)), result: updated };
    });
  }

  // Returns the removed entry, or null if another caller already removed it.
  // Callers use this to claim a tab so only one of them acts on it.
  removeSnoozedTab(tabId) {
    return this.mutate(tabs => ({
      tabs: tabs.filter(tab => tab.id !== tabId),
      result: tabs.find(tab => tab.id === tabId) || null
    }));
  }
}
