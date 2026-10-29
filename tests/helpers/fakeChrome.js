// In-memory stand-in for the chrome.* APIs the extension uses.
// Storage and tab calls resolve on a later macrotask, like the real async APIs,
// so concurrent callers interleave the way they do in a live service worker.

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

function createEvent() {
  const listeners = [];
  return {
    addListener: fn => listeners.push(fn),
    removeListener: fn => listeners.splice(listeners.indexOf(fn), 1),
    hasListeners: () => listeners.length > 0,
    // Calls every listener and returns their (possibly async) results
    dispatch: (...args) => listeners.map(fn => fn(...args)),
    listeners
  };
}

export function createFakeChrome({ storage = {}, tabs = [] } = {}) {
  const store = structuredClone(storage);
  const openTabs = new Map(tabs.map(tab => [tab.id, { ...tab }]));
  const alarms = new Map();
  const menus = new Map();
  let nextTabId = 1000;

  const chrome = {
    runtime: {
      id: 'fake-extension-id',
      lastError: undefined,
      onMessage: createEvent(),
      onInstalled: createEvent(),
      onStartup: createEvent(),
      sendMessage: jest.fn()
    },

    storage: {
      local: {
        get: jest.fn(async keys => {
          await tick();
          const list = keys == null ? Object.keys(store) : [].concat(keys);
          return Object.fromEntries(
            list.filter(key => key in store).map(key => [key, structuredClone(store[key])])
          );
        }),
        set: jest.fn(async items => {
          await tick();
          Object.assign(store, structuredClone(items));
        })
      },
      onChanged: createEvent()
    },

    tabs: {
      get: jest.fn(async id => {
        await tick();
        if (!openTabs.has(id)) throw new Error(`No tab with id: ${id}.`);
        return { ...openTabs.get(id) };
      }),
      query: jest.fn(async () => [...openTabs.values()]),
      create: jest.fn(async props => {
        await tick();
        const tab = { id: nextTabId++, windowId: 1, ...props };
        openTabs.set(tab.id, tab);
        return tab;
      }),
      remove: jest.fn(async id => {
        await tick();
        openTabs.delete(id);
      })
    },

    alarms: {
      create: jest.fn(async (name, info) => {
        alarms.set(name, { name, scheduledTime: info.when });
      }),
      clear: jest.fn(async name => alarms.delete(name)),
      get: jest.fn(async name => alarms.get(name)),
      getAll: jest.fn(async () => [...alarms.values()]),
      onAlarm: createEvent()
    },

    contextMenus: {
      create: jest.fn(props => {
        // Real Chrome reports a duplicate id through runtime.lastError
        if (menus.has(props.id)) {
          console.warn(`Cannot create item with duplicate id ${props.id}`);
          return;
        }
        menus.set(props.id, props);
      }),
      removeAll: jest.fn(callback => {
        menus.clear();
        if (callback) callback();
      }),
      onClicked: createEvent()
    },

    action: {
      openPopup: jest.fn(async () => {})
    }
  };

  // Test-only inspection helpers
  chrome._test = {
    store,
    openTabs,
    alarms,
    menus,
    tick,
    tabsWithUrl: url => [...openTabs.values()].filter(tab => tab.url === url),
    sendMessage: request => new Promise(resolve => {
      const results = chrome.runtime.onMessage.dispatch(request, {}, resolve);
      if (!results.includes(true)) resolve(undefined);
    })
  };

  return chrome;
}
