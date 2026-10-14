import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStayzTheme } from './stayzThemeContext';
import { StayzHomeScreen } from './stayzHomeScreen';
import { StayzSavedScreen } from './stayzSavedScreen';
import { StayzMyStaysScreen } from './stayzMyStaysScreen';
import { StayzMessagesScreen } from './stayzMessagesScreen';
import { StayzProfileScreen } from './stayzProfileScreen';
import { TabParamList } from './stayzNavigationTypes';

const Tab = createBottomTabNavigator<TabParamList>();

const icons: Record<keyof TabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'],
  Saved: ['heart', 'heart-outline'],
  Stays: ['calendar', 'calendar-outline'],
  Messages: ['chatbubble', 'chatbubble-outline'],
  Profile: ['person', 'person-outline'],
};

export const StayzTabNavigator = () => {
  const { colors } = useStayzTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.sub,
        tabBarStyle: { position: 'absolute', left: 15, right: 15, bottom: 18, height: 65, paddingTop: 5, paddingBottom: 2, backgroundColor: colors.card, borderTopWidth: 0, borderWidth: 1, borderColor: colors.line, borderRadius: 18, elevation: 5, shadowColor: '#000000', shadowOpacity: 0.13, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontWeight: '600', marginTop: 1 },
        tabBarIcon: ({ focused, color, size }) => <Ionicons name={icons[route.name][focused ? 0 : 1]} size={size} color={color} />,
      })}>
      <Tab.Screen name="Home" component={StayzHomeScreen} />
      <Tab.Screen name="Saved" component={StayzSavedScreen} />
      <Tab.Screen name="Stays" component={StayzMyStaysScreen} options={{ title: 'My stays' }} />
      <Tab.Screen name="Messages" component={StayzMessagesScreen} />
      <Tab.Screen name="Profile" component={StayzProfileScreen} />
    </Tab.Navigator>
  );
};
