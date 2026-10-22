const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');

export const formatMoney = (amount: number, currencySymbol: string): string =>
  `${currencySymbol}${amount.toFixed(2)}`;

export const formatDateShort = (timestamp: number): string => {
  const d = new Date(timestamp);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}`;
};

export const formatDateTime = (timestamp: number): string => {
  const d = new Date(timestamp);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const MINUTE = 60000;
const HOUR = 3600000;
const DAY = 86400000;

export const formatTimeLeft = (deadline: number, now: number): string => {
  const diff = deadline - now;
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / DAY);
  const hours = Math.floor((diff % DAY) / HOUR);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  return `${Math.max(1, Math.floor(diff / MINUTE))}m left`;
};

export const DAY_MS = DAY;

