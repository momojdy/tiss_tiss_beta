import type { Provider } from '../types/provider';

/** Demo catalogue. Replace with a backend query later. */
export const PROVIDERS: Provider[] = [
 {
  "id": "p1",
  "name": "Maison Kulay Salon",
  "type": "salon",
  "area": "Makati",
  "km": 1.2,
  "rating": 4.9,
  "rv": 412,
  "h": 335,
  "v": true,
  "sponsored": true,
  "promo": "GLOW10",
  "cats": [
   "hair",
   "makeup"
  ],
  "pay": [
   "Card",
   "GCash",
   "Wantiss wallet",
   "Pay at venue"
  ],
  "hours": "Mon to Sun · 9:00 to 19:00",
  "addr": "Salcedo Village, Makati",
  "park": "Basement parking, entrance on Tordesillas St.",
  "home": false,
  "isNew": false,
  "staff": [
   {
    "id": "s1",
    "n": "Bea Santos",
    "r": "Senior stylist"
   },
   {
    "id": "s2",
    "n": "Migs Ortega",
    "r": "Colorist"
   }
  ],
  "bio": "Colour and cut studio known for soft balayage and clean bridal styling.",
  "svc": [
   {
    "id": "m1",
    "n": "Haircut and blow-dry",
    "cat": "hair",
    "d": 45,
    "desc": "Consultation, wash, cut and blow-dry.",
    "add": [
     [
      "Deep conditioning",
      250
     ]
    ]
   },
   {
    "id": "m2",
    "n": "Balayage",
    "cat": "hair",
    "d": 180,
    "desc": "Hand-painted highlights with toner and finish. Starting price, final quote after consultation.",
    "add": [
     [
      "Olaplex treatment",
      600
     ]
    ]
   },
   {
    "id": "m3",
    "n": "Bridal makeup and trial",
    "cat": "makeup",
    "d": 120,
    "desc": "Trial session plus wedding day application.",
    "add": [
     [
      "False lashes",
      200
     ]
    ]
   }
  ]
 },
 {
  "id": "p2",
  "name": "Pink Pebble Nail Studio",
  "type": "salon",
  "area": "BGC, Taguig",
  "km": 3.4,
  "rating": 4.8,
  "rv": 268,
  "h": 350,
  "v": true,
  "sponsored": false,
  "promo": null,
  "cats": [
   "nails"
  ],
  "pay": [
   "Card",
   "GCash",
   "Pay at venue"
  ],
  "hours": "Tue to Sun · 10:00 to 20:00",
  "addr": "High Street South, BGC",
  "park": "Paid parking at High Street.",
  "home": false,
  "isNew": false,
  "staff": [
   {
    "id": "s3",
    "n": "Anne Reyes",
    "r": "Nail artist"
   },
   {
    "id": "s4",
    "n": "Kaye Lim",
    "r": "Nail technician"
   }
  ],
  "bio": "Gel, builder gel and detailed nail art. Sterilised tools, every visit.",
  "svc": [
   {
    "id": "n1",
    "n": "Gel manicure",
    "cat": "nails",
    "d": 60,
    "desc": "Shape, cuticle care and gel colour.",
    "add": [
     [
      "Simple nail art",
      150
     ],
     [
      "Gel removal",
      100
     ]
    ]
   },
   {
    "id": "n2",
    "n": "Spa pedicure",
    "cat": "nails",
    "d": 75,
    "desc": "Soak, scrub, massage and polish.",
    "add": []
   },
   {
    "id": "n3",
    "n": "Builder gel extensions",
    "cat": "nails",
    "d": 120,
    "desc": "Sculpted length with gel overlay.",
    "add": [
     [
      "Chrome finish",
      200
     ]
    ]
   }
  ]
 },
 {
  "id": "p3",
  "name": "Ate Joy Brows and Lashes",
  "type": "independent",
  "area": "Quezon City",
  "km": 5.8,
  "rating": 4.9,
  "rv": 187,
  "h": 285,
  "v": true,
  "sponsored": false,
  "promo": null,
  "cats": [
   "lashes",
   "brows"
  ],
  "pay": [
   "GCash",
   "Wantiss wallet",
   "Pay at venue"
  ],
  "hours": "Mon to Sat · 11:00 to 18:00",
  "addr": "Scout Area, Quezon City",
  "park": "Street parking.",
  "home": false,
  "isNew": false,
  "staff": [
   {
    "id": "s5",
    "n": "Joy Mendoza",
    "r": "Lash and brow artist"
   }
  ],
  "bio": "Solo lash artist. Natural sets, careful isolation, patch tests on request.",
  "svc": [
   {
    "id": "l1",
    "n": "Classic lash extensions",
    "cat": "lashes",
    "d": 90,
    "desc": "One extension per natural lash.",
    "add": [
     [
      "Lash bath",
      100
     ]
    ]
   },
   {
    "id": "l2",
    "n": "Brow lamination and tint",
    "cat": "brows",
    "d": 60,
    "desc": "Brushed-up shape with tint.",
    "add": []
   },
   {
    "id": "l3",
    "n": "Brow shaping",
    "cat": "brows",
    "d": 30,
    "desc": "Threading and trim.",
    "add": []
   }
  ]
 },
 {
  "id": "p4",
  "name": "Glow Room Skin Clinic",
  "type": "salon",
  "area": "Mandaluyong",
  "km": 4.1,
  "rating": 4.7,
  "rv": 324,
  "h": 160,
  "v": true,
  "sponsored": false,
  "promo": "GLOW10",
  "cats": [
   "skin",
   "spa"
  ],
  "pay": [
   "Card",
   "GCash",
   "Wantiss wallet"
  ],
  "hours": "Mon to Sat · 9:00 to 18:00",
  "addr": "Shaw Boulevard, Mandaluyong",
  "park": "Building parking.",
  "home": false,
  "isNew": false,
  "staff": [
   {
    "id": "s6",
    "n": "Dr. Carla Uy",
    "r": "Skin consultant"
   },
   {
    "id": "s7",
    "n": "Mika Dela Cruz",
    "r": "Facialist"
   }
  ],
  "bio": "Facials and skin consultations. Treatments listed here are non-clinical and performed by trained staff.",
  "svc": [
   {
    "id": "f1",
    "n": "Hydrating facial",
    "cat": "skin",
    "d": 60,
    "desc": "Cleanse, exfoliate, mask and moisturise.",
    "add": [
     [
      "LED light add-on",
      350
     ]
    ]
   },
   {
    "id": "f2",
    "n": "Skin consultation",
    "cat": "skin",
    "d": 30,
    "desc": "Skin analysis and a home care plan.",
    "add": []
   },
   {
    "id": "f3",
    "n": "Relaxation massage",
    "cat": "spa",
    "d": 60,
    "desc": "Full body, medium pressure.",
    "add": [
     [
      "Hot stone",
      300
     ]
    ]
   }
  ]
 },
 {
  "id": "p5",
  "name": "Kuya Ben Barbers",
  "type": "salon",
  "area": "Makati",
  "km": 2,
  "rating": 4.6,
  "rv": 521,
  "h": 215,
  "v": false,
  "sponsored": false,
  "promo": null,
  "cats": [
   "barber"
  ],
  "pay": [
   "Card",
   "GCash",
   "Pay at venue"
  ],
  "hours": "Mon to Sun · 9:00 to 21:00",
  "addr": "Poblacion, Makati",
  "park": "Street parking.",
  "home": false,
  "isNew": false,
  "staff": [
   {
    "id": "s8",
    "n": "Ben Alcaraz",
    "r": "Master barber"
   },
   {
    "id": "s9",
    "n": "Dan Cruz",
    "r": "Barber"
   }
  ],
  "bio": "Fades, tapers and hot towel shaves in the middle of Poblacion.",
  "svc": [
   {
    "id": "b1",
    "n": "Haircut and fade",
    "cat": "barber",
    "d": 40,
    "desc": "Wash, cut and style.",
    "add": [
     [
      "Beard trim",
      120
     ]
    ]
   },
   {
    "id": "b2",
    "n": "Hot towel shave",
    "cat": "barber",
    "d": 30,
    "desc": "Straight razor with hot towel.",
    "add": []
   },
   {
    "id": "b3",
    "n": "Grooming package",
    "cat": "barber",
    "d": 75,
    "desc": "Cut, beard shape and facial.",
    "add": []
   }
  ]
 },
 {
  "id": "p6",
  "name": "Hanna at Home",
  "type": "home",
  "area": "Pasig",
  "km": 6.5,
  "rating": 4.8,
  "rv": 96,
  "h": 25,
  "v": true,
  "sponsored": false,
  "promo": null,
  "cats": [
   "hair",
   "makeup",
   "nails"
  ],
  "pay": [
   "GCash",
   "Wantiss wallet",
   "Pay at service"
  ],
  "hours": "Mon to Sun · 8:00 to 18:00",
  "addr": "Serves Pasig, Mandaluyong, Makati, BGC",
  "park": "Travel fee applies outside Pasig.",
  "home": true,
  "isNew": true,
  "travel": 150,
  "staff": [
   {
    "id": "s10",
    "n": "Hanna Villar",
    "r": "Mobile stylist"
   }
  ],
  "bio": "Mobile hair, makeup and nails. Comes with her own kit, you only need a chair and good light.",
  "svc": [
   {
    "id": "h1",
    "n": "Event makeup at home",
    "cat": "makeup",
    "d": 75,
    "desc": "Natural or glam look at your address.",
    "add": [
     [
      "False lashes",
      200
     ]
    ]
   },
   {
    "id": "h2",
    "n": "Blow-dry and styling",
    "cat": "hair",
    "d": 45,
    "desc": "Wash and style at home.",
    "add": []
   },
   {
    "id": "h3",
    "n": "Home gel manicure",
    "cat": "nails",
    "d": 60,
    "desc": "Gel manicure at your address.",
    "add": []
   }
  ]
 }
];
