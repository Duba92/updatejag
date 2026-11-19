/** Local Ethiopian numbers and international numbers use the same login identity. */
export function toE164(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return `+${digits}`;
  if (digits.startsWith("251")) return `+${digits}`;
  return `+251${digits.startsWith("0") ? digits.slice(1) : digits}`;
}

export function phoneCredentials(phone: string, password: string) {
  const normalized = toE164(phone);
  if (!/^\+[1-9]\d{7,14}$/.test(normalized))
    throw new Error("Enter a valid phone number.");
  if (!password || password.length > 128)
    throw new Error("Enter a valid password.");
  return { phone: normalized, password };
}

export function signupCredentials(
  fullName: string,
  phone: string,
  password: string,
) {
  const name = fullName.trim();
  if (name.length < 2 || name.length > 80)
    throw new Error("Enter a name between 2 and 80 characters.");
  if (password.length < 8 || password.length > 128)
    throw new Error("Choose a password between 8 and 128 characters.");
  return { ...phoneCredentials(phone, password), fullName: name };
}
