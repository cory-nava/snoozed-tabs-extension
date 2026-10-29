# Contributing to Snoozed Tabs Extension

Thank you for your interest in contributing to the Snoozed Tabs Extension! This document provides guidelines and instructions for contributors.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Google Chrome (for testing)
- Git

### Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/cory-nava/snoozed-tabs-extension.git
   cd snoozed-tabs-extension
   ```

2. **Install dependencies and check everything passes**:
   ```bash
   npm install
   npx playwright install chromium   # once, for the end-to-end tests
   npm run lint && npm test && npm run test:e2e
   ```

3. **Load the extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the project directory

## Development Workflow

### Code Style

- Use ES6+ JavaScript features
- Follow consistent indentation (2 spaces)
- Use meaningful variable and function names
- Add JSDoc comments for functions
- Follow the existing code structure

### Testing

- Write tests for new features
- Run tests before submitting PRs: `npm test`
- Maintain test coverage above 80%
- Test in multiple Chrome versions when possible

### Linting

- Code must pass ESLint checks: `npm run lint`
- Fix any linting errors before submitting

### File Structure

```
snoozed-tabs-extension/
├── manifest.json              # Extension manifest
├── background.js             # Service worker entry point
├── background/               # Service worker logic
├── popup/                    # Popup interface
├── utils/                    # Utility modules
├── styles/                   # CSS files
├── icons/                    # Extension icons
├── tests/                    # Test files
└── docs/                     # Documentation
```

## Contributing Process

### 1. Issues

- Check existing issues before creating new ones
- Use issue templates when available
- Provide clear descriptions and steps to reproduce bugs
- Label issues appropriately

### 2. Pull Requests

1. **Create a branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Follow the code style guidelines
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes**:
   ```bash
   npm test             # unit tests
   npm run test:e2e     # real Chromium; run `npx playwright install chromium` once first
   npm run lint
   ```
   If you changed the popup, run `npm run screenshots` to refresh the README images.

4. **Commit your changes**:
   ```bash
   git commit -m "Add feature: your feature description"
   ```

5. **Push to your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**:
   - Use the PR template
   - Provide a clear description of changes
   - Reference related issues
   - Add screenshots for UI changes

### 3. PR Requirements

- [ ] All tests pass
- [ ] Code passes linting
- [ ] Documentation updated (if applicable)
- [ ] Backwards compatibility maintained
- [ ] Performance impact considered
- [ ] Accessibility guidelines followed

## Code Guidelines

### JavaScript

- Use `const` and `let` instead of `var`
- Use arrow functions for callbacks
- Use template literals for string interpolation
- Handle errors appropriately
- Use async/await for promises

### CSS

- Use BEM naming convention
- Mobile-first responsive design
- Consistent spacing and typography
- Use CSS custom properties for theming
- Follow accessibility guidelines

### HTML

- Use semantic HTML elements
- Include proper ARIA labels
- Ensure keyboard navigation works
- Test with screen readers

## Testing Guidelines

### Unit Tests

- Test individual functions and methods
- Mock external dependencies
- Use descriptive test names
- Test both success and error cases

### Integration Tests

- Test complete user flows
- Test Chrome API interactions
- Test storage operations
- Test timing and alarms

### Manual Testing

- Test in different screen sizes
- Test keyboard navigation
- Test with different Chrome versions
- Test with various numbers of tabs

## Extension-Specific Guidelines

### Permissions

- Request minimal necessary permissions
- Explain permission usage in PR
- Update documentation for new permissions

### Storage

- Use Chrome's storage API appropriately
- Handle storage quotas and limits
- Implement proper error handling
- Consider storage migration for updates

### Performance

- Minimize background script activity
- Use efficient algorithms
- Avoid memory leaks
- Test with many snoozed tabs

### Security

- Validate all inputs
- Sanitize user data
- Follow Chrome security guidelines
- Avoid eval() and innerHTML

## Documentation

- Update README for new features
- Add JSDoc comments for public APIs
- Include code examples
- Update changelog for releases

## Release Process

1. Update version in `manifest.json`
2. Update `CHANGELOG.md`
3. Create release notes
4. Tag the release
5. Create GitHub release
6. Submit to Chrome Web Store (maintainers only)

## Common Issues

### Extension Not Loading

- Check console for errors
- Verify manifest syntax
- Ensure all files are present
- Check file permissions

### Tests Failing

- Check Node.js version compatibility
- Clear npm cache: `npm cache clean --force`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Linting Errors

- Fix automatically: `npm run lint -- --fix`
- Check ESLint configuration
- Verify file encoding (UTF-8)

## Getting Help

- Create an issue for bugs or questions
- Check existing documentation
- Review similar extensions for patterns
- Ask maintainers for guidance

## Code of Conduct

- Be respectful and inclusive
- Help others learn and contribute
- Focus on constructive feedback
- Follow the project's code of conduct

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Happy contributing!** 🎉

For questions or help, please open an issue or reach out to the maintainers.
