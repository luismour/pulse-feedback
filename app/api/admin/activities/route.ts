import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event_id, title, description, speaker_name, activity_type, location, start_time, end_time } = body;

    if (!event_id || !title?.trim() || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Evento, título, início e término são obrigatórios.' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    // Posiciona a nova atividade no fim da grade
    const { count } = await supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event_id);

    const { data: activity, error } = await supabase
      .from('activities')
      .insert({
        event_id,
        title: title.trim(),
        description: description?.trim() || null,
        speaker_name: speaker_name?.trim() || null,
        activity_type: activity_type?.trim() || null,
        location: location?.trim() || null,
        start_time,
        end_time,
        status: 'scheduled',
        order_index: count ?? 0,
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ activity });
  } catch (err: any) {
    console.error('[create-activity] error', err);
    return NextResponse.json({ error: err.message ?? 'Erro ao criar atividade.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, event_id, ...rest } = await req.json();
    if (!id) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });

    const supabase = supabaseServer();
    const { data: activity, error } = await supabase
      .from('activities')
      .update(rest)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ activity });
  } catch (err: any) {
    console.error('[update-activity] error', err);
    return NextResponse.json({ error: err.message ?? 'Erro ao atualizar atividade.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });

    const supabase = supabaseServer();
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[delete-activity] error', err);
    return NextResponse.json({ error: err.message ?? 'Erro ao excluir atividade.' }, { status: 500 });
  }
}
