// Accepts 5-digit US zipcodes and ZIP+4 forms with a hyphen. Surrounding
// whitespace is tolerated; anything else returns null (caller surfaces error).
export function normalizeZip(input: string): string | null {
  if (typeof input !== "string") return null;
  const match = input.trim().match(/^(\d{5})(?:-\d{4})?$/);
  return match ? match[1] : null;
}
