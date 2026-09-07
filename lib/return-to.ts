/**
 * Same-origin "go back where you came from" paths, passed around as `?return_to=` and as a
 * `return_to` form field. Query-param controlled, so always run raw input through `safeReturnTo`.
 */

// Only ASCII printable characters, no backslash. Control characters matter: the URL parser
// strips tab/CR/LF, so "/<tab>/evil.com" would resolve to https://evil.com/. Browsers also
// normalize "/\evil.com" into an off-site "//evil.com".
const UNSAFE_CHARS = /[^\x21-\x7e]|\\/;

export function isSafeRelativePath(path: string) {
  if (!path.startsWith("/") || path.startsWith("//") || UNSAFE_CHARS.test(path)) {
    return false;
  }
  // Round-trip through the URL parser so any other quirk that escapes the origin is caught.
  try {
    return new URL(path, "http://relative.invalid").origin === "http://relative.invalid";
  } catch {
    return false;
  }
}

/** The path if it is a safe relative one, otherwise undefined. Accepts FormData/searchParams values. */
export function safeReturnTo(raw: unknown): string | undefined {
  return typeof raw === "string" && raw && isSafeRelativePath(raw) ? raw : undefined;
}

/** Builds `?return_to=` for links that should come back to `path` afterwards. */
export function withReturnTo(href: string, path: string) {
  return `${href}?return_to=${encodeURIComponent(path)}`;
}
