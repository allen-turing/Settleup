import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "paypay-split-super-secret-key-12345-67890";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface TokenPayload {
  userId: string;
  email: string;
}

// Unicode-safe Base64URL encoder
function base64url(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Unicode-safe Base64URL decoder
function decodeBase64url(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(base64)));
}

// Helper to compute HMAC SHA-256 signatures using standard Web Crypto Subtle API
async function hmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );
  
  // Format as base64url
  const hashArray = Array.from(new Uint8Array(signature));
  const hashString = hashArray.map(b => String.fromCharCode(b)).join("");
  return btoa(hashString)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Asynchronously sign JWT token
export async function signToken(payload: TokenPayload): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const headerStr = base64url(JSON.stringify(header));
  const payloadStr = base64url(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    })
  );
  
  const signature = await hmacSha256(`${headerStr}.${payloadStr}`, JWT_SECRET);
  return `${headerStr}.${payloadStr}.${signature}`;
}

// Asynchronously verify JWT token (Edge and Node compatible)
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.error("❌ JWT VERIFICATION ERROR: Token format is invalid.");
      return null;
    }
    
    const [headerStr, payloadStr, signature] = parts;
    const expectedSignature = await hmacSha256(`${headerStr}.${payloadStr}`, JWT_SECRET);
    
    if (signature !== expectedSignature) {
      console.error("❌ JWT VERIFICATION ERROR: Signature mismatch.");
      return null;
    }
    
    const payload = JSON.parse(decodeBase64url(payloadStr));
    if (payload.exp && payload.exp < Date.now() / 1000) {
      console.error("❌ JWT VERIFICATION ERROR: Session expired.");
      return null;
    }
    
    return payload as TokenPayload;
  } catch (e) {
    console.error("❌ JWT VERIFICATION ERROR:", e);
    return null;
  }
}

// Retrieve current authenticated user session
export async function getCurrentUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    return await verifyToken(token);
  } catch (e) {
    return null;
  }
}
