import {
  Booking,
  BookingInput,
  BookingResult,
  CardInput,
  ChatMessage,
  Listing,
  Notice,
  PaymentMethod,
  Review,
  SearchQuery,
  Thread,
} from '../types';

export interface StayzApi {
  searchListings(q: SearchQuery): Promise<Listing[]>;
  getListing(id: string): Promise<Listing>;
  getUnavailableDates(listingId: string): Promise<string[]>;
  getBusyHours(listingId: string, date: string): Promise<string[]>;
  getReviews(listingId: string): Promise<Review[]>;
  listBookings(): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking>;
  createBooking(input: BookingInput): Promise<BookingResult>;
  cancelBooking(id: string): Promise<Booking>;
  requestChange(id: string, start: string, end: string, diff: number): Promise<Booking>;
  requestExtension(id: string, units: number, price: number, methodId: string): Promise<Booking>;
  submitReview(bookingId: string, rating: number, text: string): Promise<void>;
  listSaved(): Promise<string[]>;
  toggleSaved(listingId: string): Promise<string[]>;
  getListings(ids: string[]): Promise<Listing[]>;
  walletBalance(): Promise<number>;
  listPaymentMethods(): Promise<PaymentMethod[]>;
  addCard(input: CardInput): Promise<PaymentMethod>;
  removeMethod(id: string): Promise<void>;
  listThreads(): Promise<Thread[]>;
  startThread(listingId: string, title: string): Promise<string>;
  listMessages(threadId: string): Promise<ChatMessage[]>;
  sendMessage(threadId: string, body: string): Promise<ChatMessage>;
  listNotices(): Promise<Notice[]>;
  markNoticesRead(): Promise<void>;
}
