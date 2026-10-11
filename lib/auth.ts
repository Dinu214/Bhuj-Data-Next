import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'bhuj-hp-secret-2024-change-in-production';

const COOKIE_NAME = 'hp_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export interface JwtPayload {
  id: number;
  username: string;
  displayName: string;
  role: 'admin' | 'viewer_admin' | 'user';
  groupAccess: number[];
  permissions: string[];
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET!) as JwtPayload;
  } catch {
    return null;
  }
}

// Set httpOnly cookie on a NextResponse
export function setAuthCookie(res: NextResponse, token: string): void {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   COOKIE_MAX_AGE,
    path:     '/',
  });
}

// Clear the auth cookie
export function clearAuthCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   0,
    path:     '/',
  });
}

// Read and verify the session cookie from an incoming request
export function getSessionFromRequest(req: NextRequest): JwtPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// Read session from the Next.js server-side cookies() store (for Server Components / layouts)
export function getServerSession(): JwtPayload | null {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ── RBAC helpers ──────────────────────────────────────────────────────────────

export function isAdmin(user: JwtPayload): boolean {
  return user.role === 'admin';
}

export function isAdminOrViewer(user: JwtPayload): boolean {
  return user.role === 'admin' || user.role === 'viewer_admin';
}

export function hasPermission(user: JwtPayload, permission: string): boolean {
  if (isAdminOrViewer(user)) return true;
  return user.permissions.includes(permission);
}

export function canManageGroup(user: JwtPayload, groupId: number): boolean {
  if (isAdminOrViewer(user)) return true;
  return user.groupAccess.includes(groupId);
}

// ── Route handler auth guard ──────────────────────────────────────────────────

type Handler = (req: NextRequest, user: JwtPayload, ctx?: { params: Record<string, string> }) => Promise<NextResponse>;

export function withAuth(handler: Handler) {
  return async (req: NextRequest, ctx?: { params: Record<string, string> }): Promise<NextResponse> => {
    const user = getSessionFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return handler(req, user, ctx);
  };
}

export function withAdminAuth(handler: Handler) {
  return async (req: NextRequest, ctx?: { params: Record<string, string> }): Promise<NextResponse> => {
    const user = getSessionFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    return handler(req, user, ctx);
  };
}

export function withAdminOrViewerAuth(handler: Handler) {
  return async (req: NextRequest, ctx?: { params: Record<string, string> }): Promise<NextResponse> => {
    const user = getSessionFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    if (!isAdminOrViewer(user)) return NextResponse.json({ error: 'Admin or viewer access required' }, { status: 403 });
    return handler(req, user, ctx);
  };
}
