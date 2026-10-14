import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.sub,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
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
