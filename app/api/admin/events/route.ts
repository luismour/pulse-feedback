import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { slugify } from '@/lib/slug';

export async function POST(req: NextRequest) {
  try {
    const { name, description, location, start_date, end_date } = await req.json();

    if (!name?.trim() || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Nome, data de início e data de término são obrigatórios.' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    // Garante um slug único (usado na URL pública /e/[slug])
    const baseSlug = slugify(name) || 'evento';
    let slug = baseSlug;
    let suffix = 2;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data: existing } = await supabase.from('events').select('id').eq('slug', slug).maybeSingle();
      if (!existing) break;
      slug = `${baseSlug}-${suffix++}`;
    }

    const { data: event, error } = await supabase
      .from('events')
      .insert({
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        location: location?.trim() || null,
        start_date,
        end_date,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ event });
  } catch (err: any) {
    console.error('[create-event] error', err);
    return NextResponse.json({ error: err.message ?? 'Erro ao criar evento.' }, { status: 500 });
  }
}
