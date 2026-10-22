const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;

export interface ProfileErrors { name?: string; phone?: string }

/** Name is required (40 characters max). Phone is optional but must look like a phone number. */
export function validateProfile(name: string, phone: string): ProfileErrors {
  const err: ProfileErrors = {};
  const n = name.trim();
  if (!n) err.name = 'Enter a name.';
  else if (n.length > 40) err.name = 'Use 40 characters or fewer.';
  if (phone.trim() && !PHONE_RE.test(phone.trim())) err.phone = 'Use digits only, for example +63 917 123 4567.';
  return err;
}