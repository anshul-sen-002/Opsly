interface JwtPayload {
  sub?: string;
  role?: string;
  userId?: number;
  exp?: number;
}

/** Safely decode a JWT payload without verifying the signature (client-side UX only) */
export function decodeTokenPayload(token: string): JwtPayload | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/** Expiration time in ms, or null when the token has no exp claim */
export function getTokenExpiryMs(token: string): number | null {
  const payload = decodeTokenPayload(token);
  return payload?.exp ? payload.exp * 1000 : null;
}
