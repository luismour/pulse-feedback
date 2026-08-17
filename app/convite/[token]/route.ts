import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { createAccessCookieValue, accessCookieName, ACCESS_COOKIE_TTL_SECONDS } from '@/lib/accessToken';

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const origin = req.nextUrl.origin;
  const invalidUrl = new URL('/convite/invalido', origin);

  const supabase = supabaseServer();
  const { data: invite } = await supabase
    .from('event_invites')
    .select('*, events(slug, is_active)')
    .eq('token', params.token)
    .maybeSingle();

  if (!invite || invite.is_revoked) {
    return NextResponse.redirect(invalidUrl);
  }
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.redirect(invalidUrl);
  }
  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
    return NextResponse.redirect(invalidUrl);
  }
  if (!invite.events || !invite.events.is_active) {
    return NextResponse.redirect(invalidUrl);
  }

  // Incrementa o contador de uso (best-effort — não bloqueia o acesso se essa escrita falhar)
  await supabase
    .from('event_invites')
    .update({ use_count: invite.use_count + 1 })
    .eq('id', invite.id);

  const destination = new URL(`/e/${invite.events.slug}`, origin);
  const response = NextResponse.redirect(destination);

  response.cookies.set(accessCookieName(invite.event_id), createAccessCookieValue(invite.event_id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ACCESS_COOKIE_TTL_SECONDS,
    path: '/',
  });

  return response;
}
