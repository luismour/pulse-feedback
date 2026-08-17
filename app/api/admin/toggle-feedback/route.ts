import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { activityId, open } = await req.json();

    if (!activityId || typeof open !== 'boolean') {
      return NextResponse.json({ error: 'activityId e open são obrigatórios.' }, { status: 400 });
    }

    const supabase = supabaseServer();

    const patch = open
      ? { status: 'feedback_open' as const, feedback_opened_at: new Date().toISOString() }
      : { status: 'closed' as const, feedback_closed_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from('activities')
      .update(patch)
      .eq('id', activityId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ activity: data });
  } catch (err: any) {
    console.error('[toggle-feedback] error', err);
    return NextResponse.json({ error: err.message ?? 'Erro ao atualizar status.' }, { status: 500 });
  }
}
