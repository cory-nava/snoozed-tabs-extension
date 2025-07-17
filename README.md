# Snoozed Tabs Chrome Extension

A Chrome extension that allows you to snooze tabs for later viewing with flexible scheduling options. Keep your browser organized by temporarily hiding tabs until you need them.

## ✨ Features

- **Flexible Snoozing Options**: Choose from 9 different snooze durations:
  - **Later Today**: 3 hours from now
  - **Tonight**: 6pm today
  - **Tomorrow**: 8am tomorrow
  - **Later This Week**: 3 days from now
  - **This Weekend**: 8am Saturday
  - **Next Week**: 8am next Monday
  - **In a Couple Weeks**: 2 weeks from now
  - **Next Month**: 30 days from now
  - **Someday**: Indefinitely

- **Intuitive Management**: View, edit, and remove snoozed tabs easily
- **Automatic Restoration**: Tabs automatically reappear when their snooze time expires
- **Modern UI**: Clean, accessible interface styled with Tailwind-inspired design
- **Context Menu Integration**: Right-click on tabs to snooze them
- **Persistent Storage**: Snoozed tabs persist across browser sessions

## 🚀 Installation

### From Source (Development)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/cory-nava/snoozed-tabs-extension.git
   cd snoozed-tabs-extension
   ```

2. **Install dependencies** (optional, for development):
   ```bash
   npm install
   ```

3. **Load the extension in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the project directory
   - The extension should now appear in your browser toolbar

### From Chrome Web Store

*Coming soon - extension will be published to the Chrome Web Store*

## 🎯 Usage

### Snoozing a Tab

1. **Using the Extension Popup**:
   - Click the Snoozed Tabs icon in your toolbar
   - Select your desired snooze duration
   - The current tab will be closed and snoozed

2. **Using the Context Menu**:
   - Right-click on any tab
   - Select "Snooze Tab"
   - Choose your snooze duration

### Managing Snoozed Tabs

1. **View Snoozed Tabs**:
   - Click the extension icon
   - Click "View Snoozed" to see all your snoozed tabs

2. **Edit Snooze Time**:
   - In the snoozed tabs list, click the edit icon (pencil)
   - Choose a new snooze duration

3. **Unsnooze Immediately**:
   - Click the unsnooze icon (plus) to restore the tab now

4. **Remove Permanently**:
   - Click the remove icon (×) to delete the snoozed tab

5. **Clear All**:
   - Click "Clear All" to remove all snoozed tabs

## 🛠️ Development

### Project Structure

```
snoozed-tabs-extension/
├── manifest.json              # Extension manifest
├── background.js             # Service worker (main logic)
├── popup/
│   ├── popup.html           # Extension popup UI
│   ├── popup.js             # Popup JavaScript
│   └── popup.css            # Popup styling
├── content/
│   └── content.js           # Content script
├── styles/
│   └── popup.css            # Shared styles
├── utils/
│   ├── storage.js           # Storage management
│   ├── time.js              # Time calculations
│   └── tabManager.js        # Tab operations
├── icons/                   # Extension icons
├── tests/                   # Test files
└── package.json             # Dependencies and scripts
```

### Key Components

1. **Background Service Worker** (`background.js`):
   - Handles tab snoozing/unsnoozing
   - Manages alarms for automatic restoration
   - Provides messaging interface

2. **Time Calculator** (`utils/time.js`):
   - Calculates snooze end times
   - Formats time displays
   - Handles different time zones

3. **Storage Manager** (`utils/storage.js`):
   - Manages persistent storage
   - Handles data serialization
   - Provides backup/restore functionality

4. **Tab Manager** (`utils/tabManager.js`):
   - Handles Chrome tab operations
   - Manages tab metadata
   - Provides tab utilities

5. **Popup Interface** (`popup/`):
   - User interface for snoozing
   - Snoozed tabs management
   - Modal for editing snooze times

### Development Commands

```bash
# Install dependencies
npm install

# Run tests
npm test

# Lint code
npm run lint

# Build for production
npm run build

# Package extension
npm run package
```

### Testing

The extension includes comprehensive tests:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test -- --coverage

# Run tests in watch mode
npm run test -- --watch
```

### Code Style

- ES6+ JavaScript with modules
- Consistent error handling
- Comprehensive JSDoc comments
- Accessibility considerations
- Modern CSS with custom properties

## 🔧 Technical Details

### Permissions

The extension requires these permissions:
- `tabs`: To access and manipulate browser tabs
- `storage`: To persist snoozed tab data
- `alarms`: To schedule automatic tab restoration
- `contextMenus`: To add right-click menu options
- `activeTab`: To get current tab information

### Storage Format

Snoozed tabs are stored in Chrome's local storage:

```javascript
{
  id: 'snoozed_${timestamp}_${tabId}',
  originalTabId: number,
  url: string,
  title: string,
  favIconUrl: string,
  snoozeOption: string,
  snoozedAt: number,
  unsnoozeAt: number,
  windowId: number
}
```

### Alarm System

The extension uses Chrome's `chrome.alarms` API to schedule tab restoration:
- Each snoozed tab gets its own alarm
- Alarms are cleared when tabs are manually unsnoozed
- Expired alarms trigger automatic tab restoration

## 🐛 Troubleshooting

### Common Issues

1. **Extension Not Working**:
   - Check that Developer Mode is enabled
   - Reload the extension from `chrome://extensions/`
   - Check the console for errors

2. **Tabs Not Restoring**:
   - Ensure Chrome is running when the snooze time expires
   - Check that the extension has proper permissions
   - Verify alarms are being created (check background script logs)

3. **Storage Issues**:
   - Extension data is cleared when Chrome is reset
   - Check available storage space
   - Verify storage permissions are granted

### Debug Mode

Enable debug logging by opening the extension's background script console:
1. Go to `chrome://extensions/`
2. Find "Snoozed Tabs" extension
3. Click "background page" or "service worker"
4. Check console for detailed logs

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Guidelines

- Follow the existing code style
- Add JSDoc comments for new functions
- Include tests for new features
- Update documentation as needed
- Ensure accessibility compliance

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Chrome Extension documentation and APIs
- Tailwind CSS for design inspiration
- Modern web development best practices
- Accessibility guidelines and standards

## 📧 Support

For bug reports and feature requests, please use the [GitHub Issues](https://github.com/cory-nava/snoozed-tabs-extension/issues) page.

---

**Made with ❤️ by [Cory Nava](https://github.com/cory-nava)**
