import React, { createContext, useContext, useState } from 'react';
type Checkout = { eventId: string; tierName: string; quantity: number; promo: string; paymentMethod: 'wallet' | 'card'; orderId: string; failure: string };
type Store = { checkout: Checkout; update: (patch: Partial<Checkout>) => void; reset: () => void };
const initial: Checkout = { eventId: '', tierName: '', quantity: 1, promo: '', paymentMethod: 'wallet', orderId: '', failure: '' };
const Context = createContext<Store | null>(null);
export function GatherzCheckoutProvider({ children }: { children: React.ReactNode }) {
 const [checkout, setCheckout] = useState<Checkout>(initial);
 return <Context.Provider value={{ checkout, update: patch => setCheckout(v => ({ ...v, ...patch })), reset: () => setCheckout(initial) }}>{children}</Context.Provider>;
}
export function useGatherzCheckout() { const value = useContext(Context); if (!value) throw new Error('Gatherz checkout provider missing'); return value; }
export function checkoutTotals(price: number, quantity: number, promo: string) {
 const subtotal = price * quantity;
 const discount = promo.toUpperCase() === 'GATHER10' ? subtotal * 0.1 : 0;
 const fee = Math.round((subtotal - discount) * 0.04 * 100) / 100;
 return { subtotal, discount, fee, total: subtotal - discount + fee };
}
