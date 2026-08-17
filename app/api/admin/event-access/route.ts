import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { supabaseServer } from '@/lib/supabaseServer';

function generateToken() {
  return randomBytes(18).toString('base64url'); // ~24 caracteres, seguro para URL
}

/** GET — lista os convites já gerados para um evento */
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('eventId');
  if (!eventId) {
    return NextResponse.json({ error: 'eventId é obrigatório.' }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('event_invites')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invites: data ?? [] });
}

/** POST — gera um novo convite (token aleatório) para um evento */
export async function POST(req: NextRequest) {
  try {
    const { event_id, label, max_uses, expires_at } = await req.json();
    if (!event_id) {
      return NextResponse.json({ error: 'event_id é obrigatório.' }, { status: 400 });
    }

    const supabase = supabaseServer();
    const token = generateToken();

    const { data: invite, error } = await supabase
      .from('event_invites')
      .insert({
        event_id,
        token,
        label: label?.trim() || null,
        max_uses: max_uses ?? null,
        expires_at: expires_at || null,
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ invite });
  } catch (err: any) {
    console.error('[create-invite] error', err);
    return NextResponse.json({ error: err.message ?? 'Erro ao criar convite.' }, { status: 500 });
  }
}

/** PATCH — revoga (ou reativa) um convite existente */
export async function PATCH(req: NextRequest) {
  try {
    const { id, is_revoked } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { data: invite, error } = await supabase
      .from('event_invites')
      .update({ is_revoked: !!is_revoked })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ invite });
  } catch (err: any) {
    console.error('[update-invite] error', err);
    return NextResponse.json({ error: err.message ?? 'Erro ao atualizar convite.' }, { status: 500 });
  }
}
