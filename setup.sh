#!/bin/bash

# Snoozed Tabs Extension - Development Setup Script

echo "🚀 Setting up Snoozed Tabs Extension for development..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create icons directory if it doesn't exist
mkdir -p icons

# Generate PNG icons from SVG (if imagemagick is available)
if command -v convert &> /dev/null; then
    echo "🎨 Generating PNG icons from SVG..."
    
    # Generate different sizes
    convert icons/icon.svg -resize 16x16 icons/icon16.png
    convert icons/icon.svg -resize 32x32 icons/icon32.png
    convert icons/icon.svg -resize 48x48 icons/icon48.png
    convert icons/icon.svg -resize 128x128 icons/icon128.png
    
    echo "✅ PNG icons generated successfully"
else
    echo "⚠️  ImageMagick not found. Using placeholder icons."
    echo "   Install ImageMagick to generate proper PNG icons:"
    echo "   - macOS: brew install imagemagick"
    echo "   - Ubuntu: sudo apt-get install imagemagick"
    echo "   - Windows: Download from https://imagemagick.org/"
    
    # Create simple placeholder files
    echo "Creating placeholder icon files..."
    touch icons/icon16.png
    touch icons/icon32.png
    touch icons/icon48.png
    touch icons/icon128.png
fi

# Run linting
echo "🔍 Running linter..."
npm run lint

# Run tests
echo "🧪 Running tests..."
npm test

# Check if Chrome is installed for testing
if command -v google-chrome &> /dev/null || command -v chromium-browser &> /dev/null; then
    echo "✅ Chrome/Chromium detected - ready for testing"
else
    echo "⚠️  Chrome not found. Install Chrome to test the extension:"
    echo "   - Visit: https://www.google.com/chrome/"
fi

echo ""
echo "🎉 Setup complete! Here's what to do next:"
echo ""
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode' in the top right"
echo "3. Click 'Load unpacked' and select this directory"
echo "4. The extension should now appear in your browser toolbar"
echo ""
echo "📝 Development commands:"
echo "   npm test         - Run tests"
echo "   npm run lint     - Run linter"
echo "   npm run build    - Build for production"
echo "   npm run package  - Package extension"
echo ""
echo "📚 For more information, see README.md"
echo ""
echo "Happy coding! 🎯"
