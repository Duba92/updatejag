import { createHash, pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { deleteCookie, getCookie, getRequestIP, setCookie } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@backend/integrations/supabase/client.server";
import type { AppUser } from "@backend/types";

const COOKIE_NAME = "jag_session";
const SESSION_DAYS = 30;
const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60;
const PASSWORD_ITERATIONS = 600_000;
const PASSWORD_BYTES = 32;
const RATE_WINDOW_SECONDS = 15 * 60;
const deriveBits = promisify(pbkdf2);

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await deriveBits(password, salt, PASSWORD_ITERATIONS, PASSWORD_BYTES, "sha256");
  return `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

async function derivePassword(password: string, salt: Buffer, iterations: number) {
  return deriveBits(password, salt, iterations, PASSWORD_BYTES, "sha256");
}

export async function verifyPassword(password: string, encoded: string | null) {
  if (!encoded) {
    await derivePassword(password, Buffer.alloc(16), PASSWORD_ITERATIONS);
    return false;
  }
  const [algorithm, iterationText, saltText, hashText] = encoded.split("$");
  const iterations = Number(iterationText);
  if (
    algorithm !== "pbkdf2-sha256" ||
    !Number.isInteger(iterations) ||
    iterations < 100_000 ||
    iterations > 1_000_000 ||
    !saltText ||
    !hashText
  ) {
    await derivePassword(password, Buffer.alloc(16), PASSWORD_ITERATIONS);
    return false;
  }
  const salt = Buffer.from(saltText, "base64");
  const expected = Buffer.from(hashText, "base64");
  if (salt.length !== 16 || expected.length !== PASSWORD_BYTES) return false;
  const actual = await derivePassword(password, salt, iterations);
  return timingSafeEqual(expected, actual);
}

function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

function setSessionCookie(token: string) {
  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

async function sessionTokenHash(token: string) {
  return createHash("sha256").update(token).digest("base64");
}

async function consumeRateLimit(key: string, limit: number) {
  const { data, error } = await supabaseAdmin.rpc("consume_app_auth_attempt", {
    _key_hash: createHash("sha256").update(key).digest("base64"),
    _limit: limit,
    _window_seconds: RATE_WINDOW_SECONDS,
  });
  if (error) throw new Error("Sign-in is temporarily unavailable. Please try again.");
  if (!data) throw new Error("Too many attempts. Please wait a few minutes and try again.");
}

async function enforceAuthRateLimit(phone: string) {
  await consumeRateLimit(`phone:${phone}`, 8);
  const ip = getRequestIP();
  if (ip) await consumeRateLimit(`ip:${ip}`, 30);
}

function setSessionCookieAndReturn(token: string, user: AppUser) {
  setSessionCookie(token);
  return user;
}

export async function createAppAccount(input: {
  fullName: string;
  phone: string;
  password: string;
}): Promise<AppUser> {
  await enforceAuthRateLimit(input.phone);
  const token = createSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_SECONDS * 1000).toISOString();
  const { data, error } = await supabaseAdmin.rpc("create_app_account", {
    _phone: input.phone,
    _full_name: input.fullName.trim(),
    _password_hash: await hashPassword(input.password),
    _token_hash: await sessionTokenHash(token),
    _expires_at: expiresAt,
  });
  if (error) {
    if (error.code === "23505")
      throw new Error("This phone number already has an account. Please sign in.");
    console.error("createAppAccount failed", error.message);
    throw new Error("We couldn't create your account. Please try again.");
  }
  return setSessionCookieAndReturn(token, {
    id: data,
    phone: input.phone,
    full_name: input.fullName.trim(),
  });
}

export async function signInAppAccount(input: {
  phone: string;
  password: string;
}): Promise<AppUser> {
  await enforceAuthRateLimit(input.phone);
  const { data: account, error } = await supabaseAdmin
    .from("app_users")
    .select("id, phone, password_hash")
    .eq("phone", input.phone)
    .maybeSingle();
  if (error) throw new Error("Sign-in is temporarily unavailable. Please try again.");
  if (!(await verifyPassword(input.password, account?.password_hash ?? null)) || !account?.phone) {
    throw new Error("That phone number or password isn't correct.");
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", account.id)
    .maybeSingle();
  if (profileError || !profile) throw new Error("We couldn't load your account. Please try again.");

  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  const { error: sessionError } = await supabaseAdmin.from("app_sessions").insert({
    token_hash: await sessionTokenHash(token),
    user_id: account.id,
    expires_at: expiresAt,
  });
  if (sessionError) throw new Error("Sign-in is temporarily unavailable. Please try again.");
  return setSessionCookieAndReturn(token, {
    id: account.id,
    phone: account.phone,
    full_name: profile.full_name,
  });
}

export async function getAppSessionUser(): Promise<AppUser | null> {
  const token = getCookie(COOKIE_NAME);
  if (!token || token.length > 128) return null;
  const tokenHash = await sessionTokenHash(token);
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("app_sessions")
    .select("user_id, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (sessionError) throw new Error("We couldn't verify your session. Please try again.");
  if (!session) return null;
  if (Date.parse(session.expires_at) <= Date.now()) {
    const { error } = await supabaseAdmin.from("app_sessions").delete().eq("token_hash", tokenHash);
    if (error) throw new Error("We couldn't refresh your session. Please try again.");
    deleteCookie(COOKIE_NAME, { path: "/", sameSite: "lax" });
    return null;
  }

  const [{ data: account, error: accountError }, { data: profile, error: profileError }] =
    await Promise.all([
      supabaseAdmin.from("app_users").select("id, phone").eq("id", session.user_id).maybeSingle(),
      supabaseAdmin.from("profiles").select("full_name").eq("id", session.user_id).maybeSingle(),
    ]);
  if (accountError || profileError)
    throw new Error("We couldn't verify your session. Please try again.");
  if (!account?.phone || !profile) return null;
  return { id: account.id, phone: account.phone, full_name: profile.full_name };
}

export async function requireAppSessionUser() {
  const user = await getAppSessionUser();
  if (!user) throw new Error("You need to sign in to do that.");
  return user;
}

export async function signOutAppAccount() {
  const token = getCookie(COOKIE_NAME);
  if (token) {
    const { error } = await supabaseAdmin
      .from("app_sessions")
      .delete()
      .eq("token_hash", await sessionTokenHash(token));
    if (error) throw new Error("We couldn't sign you out. Please try again.");
  }
  deleteCookie(COOKIE_NAME, { path: "/", sameSite: "lax" });
}
