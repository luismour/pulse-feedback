import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Gera (ou recupera) um token de dispositivo anônimo, usado para:
 *  - permitir feedback sem exigir login/cadastro do participante
 *  - impedir que o mesmo celular avalie a mesma atividade duas vezes
 */
export function getDeviceToken(): string {
  const KEY = 'pulse_device_token';
  let token = typeof window !== 'undefined' ? localStorage.getItem(KEY) : null;
  if (!token) {
    token = crypto.randomUUID();
    if (typeof window !== 'undefined') localStorage.setItem(KEY, token);
  }
  return token;
}
