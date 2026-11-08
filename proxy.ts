import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * A fresh CSP nonce on each dynamically rendered page response.
 * Static prerender/PPR is disabled for this reason.
 * No values from the untrusted request are interpolated into the CSP.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDevelopment = process.env.NODE_ENV === "development";
  const policy = [
    "default-src 'self'",
    "script-src 'self' 'nonce-"+nonce+"' 'strict-dynamic'"+(isDevelopment?" 'unsafe-eval'":""),
    "style-src 'self' 'nonce-"+nonce+"'",
    // The React score bars use harmless inline width style attributes.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self'",
  ].join("; ")+";";
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce",nonce);
  requestHeaders.set("Content-Security-Policy",policy);
  const response = NextResponse.next({request:{headers:requestHeaders}});
  response.headers.set("Content-Security-Policy",policy);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
