import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { RootStackParamList } from '../../types';
import { ResultsScreen } from '../screens/ResultsScreen';
import { FiltersScreen } from '../screens/FiltersScreen';
import { PropertyScreen } from '../screens/PropertyScreen';
import { PhotosScreen } from '../screens/PhotosScreen';
import { ReviewsScreen } from '../screens/ReviewsScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import { PaymentMethodsScreen } from '../screens/PaymentMethodsScreen';
import { AddCardScreen } from '../screens/AddCardScreen';
import { ProcessingScreen } from '../screens/ProcessingScreen';
import { ConfirmationScreen } from '../screens/ConfirmationScreen';
import { InsufficientBalanceScreen } from '../screens/InsufficientBalanceScreen';
import { BookingDetailScreen } from '../screens/BookingDetailScreen';
import { CancelBookingScreen } from '../screens/CancelBookingScreen';
import { ChangeRequestScreen } from '../screens/ChangeRequestScreen';
import { ExtendStayScreen } from '../screens/ExtendStayScreen';
import { WriteReviewScreen } from '../screens/WriteReviewScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { HelpScreen } from '../screens/HelpScreen';
import { CurrencyScreen } from '../screens/CurrencyScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Tabs" component={TabNavigator} />
    <Stack.Screen name="Results" component={ResultsScreen} />
    <Stack.Screen name="Filters" component={FiltersScreen} options={{ presentation: 'modal' }} />
    <Stack.Screen name="Property" component={PropertyScreen} />
    <Stack.Screen name="Photos" component={PhotosScreen} />
    <Stack.Screen name="Reviews" component={ReviewsScreen} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} />
    <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
    <Stack.Screen name="AddCard" component={AddCardScreen} />
    <Stack.Screen name="Processing" component={ProcessingScreen} options={{ gestureEnabled: false }} />
    <Stack.Screen name="Confirmation" component={ConfirmationScreen} options={{ gestureEnabled: false }} />
    <Stack.Screen name="Insufficient" component={InsufficientBalanceScreen} />
    <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
    <Stack.Screen name="CancelBooking" component={CancelBookingScreen} />
    <Stack.Screen name="ChangeRequest" component={ChangeRequestScreen} />
    <Stack.Screen name="ExtendStay" component={ExtendStayScreen} />
    <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
    <Stack.Screen name="Chat" component={ChatScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Help" component={HelpScreen} />
    <Stack.Screen name="Currency" component={CurrencyScreen} />
  </Stack.Navigator>
);
