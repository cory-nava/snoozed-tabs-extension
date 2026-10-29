import manifest from '../manifest.json';

// Keeps the extension's access to a minimum: it never needs to read or modify web pages.
test('the extension does not inject scripts into or expose files to websites', () => {
  expect(manifest.content_scripts).toBeUndefined();
  expect(manifest.web_accessible_resources).toBeUndefined();
  expect(manifest.host_permissions).toBeUndefined();
});

test('the extension asks only for the permissions it uses', () => {
  expect([...manifest.permissions].sort()).toEqual(['activeTab', 'alarms', 'contextMenus', 'storage', 'tabs']);
});
