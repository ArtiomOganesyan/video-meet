// If NEXT_PUBLIC_NEST_SERVER_URL is set it will be used (for direct dev connections).
// Otherwise leave undefined so the client connects to the current origin (recommended when
// front+back are proxied through nginx at the same host/port).
export const NEST_SERVER_URL: string | undefined =
  process.env.NEXT_PUBLIC_NEST_SERVER_URL || "http://backend:11002";
