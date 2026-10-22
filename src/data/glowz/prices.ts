/** Real numbers kept apart from services so catalogue edits never touch saved bookings (snapshot rule). */
export const PRICE: Record<string, number> = {
 "m1": 850,
 "m2": 4500,
 "m3": 6500,
 "n1": 650,
 "n2": 700,
 "n3": 1500,
 "l1": 1800,
 "l2": 1200,
 "l3": 350,
 "f1": 1500,
 "f2": 500,
 "f3": 1100,
 "b1": 350,
 "b2": 300,
 "b3": 750,
 "h1": 2500,
 "h2": 900,
 "h3": 800
};

/** Services whose listed price is a starting price (final quote after consultation). */
export const STARTING: Record<string, 1> = {
 "m2": 1
};
