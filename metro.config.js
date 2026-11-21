const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The Konsoliss How It Works assets use an uppercase .PNG extension.
// Metro resolves asset extensions case-sensitively, so explicitly include it.
config.resolver.assetExts = [...config.resolver.assetExts, 'PNG'];

const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return { type: 'sourceFile', filePath: require.resolve('./src/components/NativeMap.web.tsx') };
  }
  return resolveRequest
    ? resolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
