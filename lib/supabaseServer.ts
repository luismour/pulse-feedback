import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase server-side, usado SOMENTE dentro de rotas de API (app/api/**).
 * Usa a Service Role Key, que ignora RLS — por isso nunca deve ser importado
 * em componentes de cliente ('use client') nem exposto ao browser.
 *
 * Em produção, proteja as rotas /api/admin/** com autenticação real
 * (Supabase Auth + verificação de sessão) antes de confiar cegamente nelas.
 */
export function supabaseServer() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}
