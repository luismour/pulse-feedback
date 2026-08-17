import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.ACCESS_TOKEN_SECRET ?? '';

if (!SECRET) {
  // Não lança erro (evita quebrar o build sem a env var), mas sign()/verify()
  // falham de forma segura — sem secret, ninguém consegue provar acesso.
  console.warn('[accessToken] ACCESS_TOKEN_SECRET não configurada — o acesso a eventos ficará sempre bloqueado.');
}

const COOKIE_PREFIX = 'pf_access_';
const DEFAULT_TTL_DAYS = 180;
export const ACCESS_COOKIE_TTL_SECONDS = DEFAULT_TTL_DAYS * 24 * 60 * 60;

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('base64url');
}

/** Gera o valor do cookie de acesso para um evento específico: "{expiraEm}.{assinatura}" */
export function createAccessCookieValue(eventId: string, ttlDays = DEFAULT_TTL_DAYS): string {
  const expiresAt = Date.now() + ttlDays * 24 * 60 * 60 * 1000;
  const payload = `${eventId}.${expiresAt}`;
  return `${expiresAt}.${sign(payload)}`;
}

/** Verifica se o cookie autoriza de fato o acesso a ESTE eventId (comparação em tempo constante) */
export function verifyAccessCookieValue(eventId: string, cookieValue: string | undefined): boolean {
  if (!SECRET || !cookieValue) return false;

  const [expiresAtStr, signature] = cookieValue.split('.');
  if (!expiresAtStr || !signature) return false;

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expectedSignature = sign(`${eventId}.${expiresAt}`);

  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function accessCookieName(eventId: string): string {
  return `${COOKIE_PREFIX}${eventId}`;
}
