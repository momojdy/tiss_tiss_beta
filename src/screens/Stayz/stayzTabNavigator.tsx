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
        tabBarStyle: { position: 'absolute', left: 16, right: 16, bottom: 18, marginHorizontal: 0, width: undefined, alignSelf: 'stretch', height: 65, paddingTop: 5, paddingBottom: 2, backgroundColor: 'rgba(255,255,255,0.88)', borderTopWidth: 0, borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', borderRadius: 18, elevation: 5, shadowColor: '#000', shadowOpacity: 0.13, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
        tabBarItemStyle: { flex: 1, minWidth: 0 },
        tabBarLabelStyle: { fontSize: 10.5, lineHeight: 13, fontWeight: '600', marginTop: 1, paddingTop: 4 },
        tabBarIcon: ({ focused, color }) => <Ionicons name={icons[route.name][focused ? 0 : 1]} size={24} color={color} />,
      })}>
      <Tab.Screen name="Home" component={StayzHomeScreen} />
      <Tab.Screen name="Saved" component={StayzSavedScreen} />
      <Tab.Screen name="Stays" component={StayzMyStaysScreen} options={{ title: 'My stays' }} />
      <Tab.Screen name="Messages" component={StayzMessagesScreen} />
      <Tab.Screen name="Profile" component={StayzProfileScreen} />
    </Tab.Navigator>
  );
};
