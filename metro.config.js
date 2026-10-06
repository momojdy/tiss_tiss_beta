const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The Konsoliss How It Works assets use an uppercase .PNG extension.
// Metro resolves asset extensions case-sensitively, so explicitly include it.
config.resolver.assetExts = [...config.resolver.assetExts, 'PNG'];

module.exports = config;
