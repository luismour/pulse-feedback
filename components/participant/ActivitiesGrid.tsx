'use client';

import { useEffect, useState } from 'react';
import { supabase, getDeviceToken } from '@/lib/supabaseClient';
import ActivityCard from './ActivityCard';
import FeedbackForm from './FeedbackForm';
import type { Activity, FeedbackForm as FeedbackFormType, Question } from '@/types/database';

interface ActivitiesGridProps {
  eventId: string;
  activities: Activity[];
}

export default function ActivitiesGrid({ eventId, activities }: ActivitiesGridProps) {
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [activeForm, setActiveForm] = useState<{ activity: Activity; form: FeedbackFormType } | null>(null);

  // Ao carregar, verifica quais atividades este dispositivo já avaliou
  useEffect(() => {
    async function loadSubmissions() {
      const deviceToken = getDeviceToken();
      const { data: participant } = await supabase
        .from('participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('device_token', deviceToken)
        .maybeSingle();
      if (!participant) return;

      const { data: submissions } = await supabase
        .from('feedback_submissions')
        .select('activity_id')
        .eq('participant_id', participant.id);

      setSubmittedIds(new Set((submissions ?? []).map((s) => s.activity_id)));
    }
    loadSubmissions();
  }, [eventId]);

  async function handleOpen(activity: Activity) {
    const { data: form } = await supabase
      .from('forms')
      .select('*')
      .eq('activity_id', activity.id)
      .eq('status', 'published')
      .maybeSingle();

    if (!form) return; // admin ainda não publicou o formulário desta atividade

    const { data: questions } = await supabase
      .from('questions')
      .select('*, question_options(*)')
      .eq('form_id', form.id)
      .order('order_index', { ascending: true });

    const hydratedQuestions: Question[] = (questions ?? []).map((q: any) => ({
      ...q,
      options: (q.question_options ?? []).sort((a: any, b: any) => a.order_index - b.order_index),
    }));

    setActiveForm({ activity, form: { ...form, questions: hydratedQuestions } });
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            hasSubmitted={submittedIds.has(activity.id)}
            onOpen={handleOpen}
          />
        ))}
      </div>

      {activeForm && (
        <FeedbackForm
          activity={activeForm.activity}
          form={activeForm.form}
          eventId={eventId}
          onClose={() => setActiveForm(null)}
          onSubmitted={() => {
            setSubmittedIds((prev) => new Set(prev).add(activeForm.activity.id));
          }}
        />
      )}
    </>
  );
}
