import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ADMIN_COOKIE, parseCookies } from "../lib/cookies.js";
import { AppError } from "../lib/errors.js";

export function signToken(user, secret, expiresIn = "8h") {
  if (!secret || secret.length < 16) {
    throw new AppError(503, "AUTH_NOT_CONFIGURED", "Set ADMIN_JWT_SECRET to a random string of at least 16 characters.");
  }
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, secret, { expiresIn });
}

export function authorizeAdmin(cookieHeader, secret) {
  if (!secret || secret.length < 16) {
    throw new AppError(503, "AUTH_NOT_CONFIGURED", "Admin authentication is not configured.");
  }
  const token = parseCookies(cookieHeader)[ADMIN_COOKIE];
  if (!token) throw new AppError(401, "UNAUTHENTICATED", "Sign in required");
  try {
    const payload = jwt.verify(token, secret);
    if (payload.role !== "ADMIN") throw new AppError(403, "FORBIDDEN", "Admin access required");
    return { id: payload.sub, email: payload.email, role: payload.role };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(401, "UNAUTHENTICATED", "Sign in required");
  }
}

export function signAdminToken(user) {
  return signToken(user, env.ADMIN_JWT_SECRET, env.ADMIN_JWT_EXPIRES_IN);
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.COOKIE_SAMESITE,
    path: "/",
    maxAge: 8 * 60 * 60 * 1000,
  };
}

export function setAuthCookie(res, token) {
  res.cookie(ADMIN_COOKIE, token, cookieOptions());
}

export function clearAuthCookie(res) {
  res.clearCookie(ADMIN_COOKIE, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.COOKIE_SAMESITE,
    path: "/",
  });
}

export function requireAdmin(req, res, next) {
  try {
    req.admin = authorizeAdmin(req.headers.cookie, env.ADMIN_JWT_SECRET);
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, "UNAUTHENTICATED", "Sign in required"));
  }
}

export function requireBrowserOrigin(req, res, next) {
  const origin = req.get("origin");
  if (!origin) return next();
  if (!env.allowedOrigins.includes(origin)) {
    return next(new AppError(403, "FORBIDDEN", "Origin not allowed"));
  }
  next();
}
