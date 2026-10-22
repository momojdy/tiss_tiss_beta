/** Icon geometry ported from the prototype icon set (24x24 grid, stroke style). */
export type IconShape = { t: 'path' | 'circle' | 'rect'; [attr: string]: string };
export const ICON_SHAPES: Record<string, IconShape[]> = {
 "home": [
  {
   "t": "path",
   "d": "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"
  }
 ],
 "explore": [
  {
   "t": "circle",
   "cx": "11",
   "cy": "11",
   "r": "7"
  },
  {
   "t": "path",
   "d": "M20 20l-4-4"
  }
 ],
 "cal": [
  {
   "t": "rect",
   "x": "3",
   "y": "5",
   "width": "18",
   "height": "16",
   "rx": "3"
  },
  {
   "t": "path",
   "d": "M8 3v4M16 3v4M3 10h18"
  }
 ],
 "heart": [
  {
   "t": "path",
   "d": "M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"
  }
 ],
 "user": [
  {
   "t": "circle",
   "cx": "12",
   "cy": "8",
   "r": "4"
  },
  {
   "t": "path",
   "d": "M4 21c0-4 3.6-7 8-7s8 3 8 7"
  }
 ],
 "bell": [
  {
   "t": "path",
   "d": "M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4"
  }
 ],
 "pin": [
  {
   "t": "path",
   "d": "M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z"
  },
  {
   "t": "circle",
   "cx": "12",
   "cy": "10",
   "r": "2.5"
  }
 ],
 "back": [
  {
   "t": "path",
   "d": "M15 5l-7 7 7 7"
  }
 ],
 "chat": [
  {
   "t": "path",
   "d": "M4 5h16v11H9l-5 4z"
  }
 ],
 "share": [
  {
   "t": "path",
   "d": "M12 3v12M7 8l5-5 5 5M5 14v6h14v-6"
  }
 ],
 "check": [
  {
   "t": "path",
   "d": "M5 12l5 5 9-10"
  }
 ],
 "close": [
  {
   "t": "path",
   "d": "M6 6l12 12M18 6L6 18"
  }
 ],
 "filter": [
  {
   "t": "path",
   "d": "M4 6h16M7 12h10M10 18h4"
  }
 ],
 "star": [
  {
   "t": "path",
   "d": "M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.3l1.1-6.2L3 9.7l6.2-.9z",
   "fill": "currentColor"
  }
 ],
 "home2": [
  {
   "t": "path",
   "d": "M3 11l9-8 9 8"
  },
  {
   "t": "path",
   "d": "M5 10v10h14V10"
  }
 ],
 "flag": [
  {
   "t": "path",
   "d": "M5 21V4h12l-2 4 2 4H5"
  }
 ],
 "gift": [
  {
   "t": "rect",
   "x": "3",
   "y": "8",
   "width": "18",
   "height": "5"
  },
  {
   "t": "path",
   "d": "M5 13v8h14v-8M12 8v13M12 8c-3 0-5-4-2-4 2 0 2 4 2 4zm0 0c3 0 5-4 2-4-2 0-2 4-2 4z"
  }
 ],
 "scis": [
  {
   "t": "circle",
   "cx": "6",
   "cy": "6",
   "r": "3"
  },
  {
   "t": "circle",
   "cx": "6",
   "cy": "18",
   "r": "3"
  },
  {
   "t": "path",
   "d": "M8.5 8L20 18M8.5 16L20 6"
  }
 ],
 "spark": [
  {
   "t": "path",
   "d": "M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"
  }
 ],
 "eye": [
  {
   "t": "path",
   "d": "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
  },
  {
   "t": "circle",
   "cx": "12",
   "cy": "12",
   "r": "3"
  }
 ],
 "brow": [
  {
   "t": "path",
   "d": "M3 14c4-6 12-7 18-3"
  },
  {
   "t": "circle",
   "cx": "12",
   "cy": "17",
   "r": "2"
  }
 ],
 "leaf": [
  {
   "t": "path",
   "d": "M5 19c0-9 5-14 15-14 0 10-5 15-15 14zM5 19c3-5 6-8 10-10"
  }
 ],
 "lip": [
  {
   "t": "path",
   "d": "M3 12c3-4 6-4 9-2 3-2 6-2 9 2-3 5-6 6-9 6s-6-1-9-6z"
  }
 ],
 "nail": [
  {
   "t": "path",
   "d": "M8 21V11a4 4 0 0 1 8 0v10zM8 15h8"
  }
 ],
 "comb": [
  {
   "t": "path",
   "d": "M4 8h16v4H4zM6 12v6M10 12v6M14 12v6M18 12v6"
  }
 ],
 "camera": [
  {
   "t": "path",
   "d": "M4 8h3l2-3h6l2 3h3v11H4z"
  },
  {
   "t": "circle",
   "cx": "12",
   "cy": "13",
   "r": "3.5"
  }
 ],
 "lotus": [
  {
   "t": "path",
   "d": "M12 20c-4 0-8-3-9-8 4 0 7 1 9 4 2-3 5-4 9-4-1 5-5 8-9 8zM12 16c-3-3-3-8 0-12 3 4 3 9 0 12z"
  }
 ]
};
export type GlowzIconName = 'home' | 'explore' | 'cal' | 'heart' | 'user' | 'bell' | 'pin' | 'back' | 'chat' | 'share' | 'check' | 'close' | 'filter' | 'star' | 'home2' | 'flag' | 'gift' | 'scis' | 'spark' | 'eye' | 'brow' | 'leaf' | 'lip' | 'nail' | 'comb' | 'camera' | 'lotus';