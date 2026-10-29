# Changelog

All notable changes to Snoozed Tabs are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-10-29

### Fixed
- A snoozed tab could reopen twice when it came due while Chrome had put the extension to sleep.
- "Clear All" could leave some snoozed tabs behind.
- Snoozing two tabs at the same moment could lose one of them.
- "Someday" tabs showed a countdown of thousands of days.
- The right-click menu logged an error each time the extension woke up.

### Changed
- Tabs that came due while Chrome was closed now reopen as soon as Chrome starts.
- The extension keeps the same ID wherever it's installed from, so updating from a new folder keeps your snoozed tabs.
- Releases are published as a ZIP containing only the extension's files.

### Removed
- The script that ran on every web page you visited. The extension no longer reads or changes web pages.

### Security
- Page titles are always shown as plain text in the popup, never as HTML.

## [1.0.0] - 2025-07-22

### Added
- First version: snooze the current tab for one of nine preset times, view and edit snoozed tabs, and reopen them automatically.

[1.1.0]: https://github.com/cory-nava/snoozed-tabs-extension/compare/779d2d7...v1.1.0
[1.0.0]: https://github.com/cory-nava/snoozed-tabs-extension/commit/779d2d7
