import { registerRootComponent } from 'expo';

// Load App only after configuration is present: its Supabase client is created
// at import time and cannot start without these values.
const configured =
  Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const App = configured
  ? require('./App').default
  : require('./src/screens/SetupRequiredScreen').default;

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
