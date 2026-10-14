import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StayzTabNavigator } from './stayzTabNavigator';
import { RootStackParamList } from './stayzNavigationTypes';
import { StayzResultsScreen } from './stayzResultsScreen';
import { StayzFiltersScreen } from './stayzFiltersScreen';
import { StayzPropertyScreen } from './stayzPropertyScreen';
import { StayzPhotosScreen } from './stayzPhotosScreen';
import { StayzReviewsScreen } from './stayzReviewsScreen';
import { StayzCheckoutScreen } from './stayzCheckoutScreen';
import { StayzPaymentMethodsScreen } from './stayzPaymentMethodsScreen';
import { StayzAddCardScreen } from './stayzAddCardScreen';
import { StayzProcessingScreen } from './stayzProcessingScreen';
import { StayzConfirmationScreen } from './stayzConfirmationScreen';
import { StayzInsufficientBalanceScreen } from './stayzInsufficientBalanceScreen';
import { StayzBookingDetailScreen } from './stayzBookingDetailScreen';
import { StayzCancelBookingScreen } from './stayzCancelBookingScreen';
import { StayzChangeRequestScreen } from './stayzChangeRequestScreen';
import { StayzExtendStayScreen } from './stayzExtendStayScreen';
import { StayzWriteReviewScreen } from './stayzWriteReviewScreen';
import { StayzChatScreen } from './stayzChatScreen';
import { StayzNotificationsScreen } from './stayzNotificationsScreen';
import { StayzHelpScreen } from './stayzHelpScreen';
import { StayzCurrencyScreen } from './stayzCurrencyScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const StayzRootNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Tabs" component={StayzTabNavigator} />
    <Stack.Screen name="Results" component={StayzResultsScreen} />
    <Stack.Screen name="Filters" component={StayzFiltersScreen} options={{ presentation: 'modal' }} />
    <Stack.Screen name="Property" component={StayzPropertyScreen} />
    <Stack.Screen name="Photos" component={StayzPhotosScreen} />
    <Stack.Screen name="Reviews" component={StayzReviewsScreen} />
    <Stack.Screen name="Checkout" component={StayzCheckoutScreen} />
    <Stack.Screen name="PaymentMethods" component={StayzPaymentMethodsScreen} />
    <Stack.Screen name="AddCard" component={StayzAddCardScreen} />
    <Stack.Screen name="Processing" component={StayzProcessingScreen} options={{ gestureEnabled: false }} />
    <Stack.Screen name="Confirmation" component={StayzConfirmationScreen} options={{ gestureEnabled: false }} />
    <Stack.Screen name="Insufficient" component={StayzInsufficientBalanceScreen} />
    <Stack.Screen name="BookingDetail" component={StayzBookingDetailScreen} />
    <Stack.Screen name="CancelBooking" component={StayzCancelBookingScreen} />
    <Stack.Screen name="ChangeRequest" component={StayzChangeRequestScreen} />
    <Stack.Screen name="ExtendStay" component={StayzExtendStayScreen} />
    <Stack.Screen name="WriteReview" component={StayzWriteReviewScreen} />
    <Stack.Screen name="Chat" component={StayzChatScreen} />
    <Stack.Screen name="Notifications" component={StayzNotificationsScreen} />
    <Stack.Screen name="Help" component={StayzHelpScreen} />
    <Stack.Screen name="Currency" component={StayzCurrencyScreen} />
  </Stack.Navigator>
);
