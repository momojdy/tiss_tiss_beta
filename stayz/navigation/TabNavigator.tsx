import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../ThemeContext';
import { HomeScreen } from '../screens/HomeScreen';
import { SavedScreen } from '../screens/SavedScreen';
import { MyStaysScreen } from '../screens/MyStaysScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { TabParamList } from '../../types';

const Tab = createBottomTabNavigator<TabParamList>();
const icons: Record<keyof TabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'], Saved: ['heart', 'heart-outline'], Stays: ['calendar', 'calendar-outline'], Messages: ['chatbubble', 'chatbubble-outline'], Profile: ['person', 'person-outline'],
};

export const TabNavigator = () => {
  const { colors } = useTheme();
  return <Tab.Navigator screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: colors.brand, tabBarInactiveTintColor: colors.sub, tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }, tabBarIcon: ({ focused, color, size }) => <Ionicons name={icons[route.name][focused ? 0 : 1]} size={size} color={color} /> })}>
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Saved" component={SavedScreen} />
    <Tab.Screen name="Stays" component={MyStaysScreen} options={{ title: 'My stays' }} />
    <Tab.Screen name="Messages" component={MessagesScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>;
};
