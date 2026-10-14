import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type TabParamList = {
  Home: undefined;
  Saved: undefined;
  Stays: undefined;
  Messages: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Results: undefined;
  Filters: undefined;
  Property: { id: string };
  Photos: { id: string };
  Reviews: { id: string };
  Checkout: { id: string };
  PaymentMethods: undefined;
  AddCard: undefined;
  Processing: { id: string };
  Confirmation: { id: string };
  Insufficient: { needed: number; listingId: string };
  BookingDetail: { id: string };
  CancelBooking: { id: string };
  ChangeRequest: { id: string };
  ExtendStay: { id: string };
  WriteReview: { id: string };
  Chat: { id: string; title: string };
  Notifications: undefined;
  Help: undefined;
  Currency: undefined;
};

export type RootProps<K extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, K>;
