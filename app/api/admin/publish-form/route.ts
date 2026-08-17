import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import type { EditableQuestion } from '@/types/database';

/** GET — retorna o formulário e as perguntas já publicadas/salvas para a atividade (se existirem) */
export async function GET(req: NextRequest) {
  const activityId = req.nextUrl.searchParams.get('activityId');
  if (!activityId) {
    return NextResponse.json({ error: 'activityId é obrigatório.' }, { status: 400 });
  }

  const supabase = supabaseServer();

  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('*')
    .eq('activity_id', activityId)
    .maybeSingle();
  if (formError) return NextResponse.json({ error: formError.message }, { status: 500 });
  if (!form) return NextResponse.json({ form: null, questions: [] });

  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('*, question_options(*)')
    .eq('form_id', form.id)
    .order('order_index', { ascending: true });
  if (questionsError) return NextResponse.json({ error: questionsError.message }, { status: 500 });

  const hydrated = (questions ?? []).map((q: any) => ({
    id: q.id,
    question_text: q.question_text,
    question_type: q.question_type,
    is_required: q.is_required,
    ai_generated: q.ai_generated,
    ai_edited: q.ai_edited,
    helper_text: q.helper_text ?? undefined,
    options: (q.question_options ?? [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((o: any) => o.option_text),
  }));

  return NextResponse.json({ form, questions: hydrated });
}

export async function POST(req: NextRequest) {
  try {
    const { activityId, theme, questions } = (await req.json()) as {
      activityId: string;
      theme?: string;
      questions: EditableQuestion[];
    };

    if (!activityId || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Dados incompletos para publicar o formulário.' }, { status: 400 });
    }

    const supabase = supabaseServer();

    const { data: form, error: formError } = await supabase
      .from('forms')
      .upsert(
        {
          activity_id: activityId,
          title: 'Avalie esta atividade',
          ai_generated: questions.some((q) => q.ai_generated),
          ai_source_theme: theme || null,
          ai_model_used: 'gemini-3.6-flash',
          status: 'published',
        },
        { onConflict: 'activity_id' }
      )
      .select('id')
      .single();
    if (formError) throw formError;

    // Substitui as perguntas existentes pelo conjunto atual editado no admin
    const { error: deleteError } = await supabase.from('questions').delete().eq('form_id', form.id);
    if (deleteError) throw deleteError;

    for (const [index, q] of questions.entries()) {
      const { data: inserted, error: qError } = await supabase
        .from('questions')
        .insert({
          form_id: form.id,
          question_text: q.question_text,
          question_type: q.question_type,
          is_required: q.is_required,
          order_index: index,
          ai_generated: q.ai_generated,
          ai_edited: q.ai_edited,
          helper_text: q.helper_text ?? null,
        })
        .select('id')
        .single();
      if (qError) throw qError;

      if (q.options?.length) {
        const optionRows = q.options.map((text, i) => ({
          question_id: inserted.id,
          option_text: text,
          order_index: i,
        }));
        const { error: optError } = await supabase.from('question_options').insert(optionRows);
        if (optError) throw optError;
      }
    }

    return NextResponse.json({ success: true, formId: form.id });
  } catch (err: any) {
    console.error('[publish-form] error', err);
    return NextResponse.json({ error: err.message ?? 'Erro ao publicar formulário.' }, { status: 500 });
  }
}
