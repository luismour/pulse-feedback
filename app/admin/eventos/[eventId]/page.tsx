import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import EventAdminDashboard from '@/components/admin/EventAdminDashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EventAdminPage({ params }: { params: { eventId: string } }) {
  if (!params?.eventId) notFound();

  const supabase = supabaseServer();

  const { data: event } = await supabase.from('events').select('*').eq('id', params.eventId).maybeSingle();
  if (!event) notFound();

  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .eq('event_id', event.id)
    .order('order_index', { ascending: true });

  return <EventAdminDashboard event={event} initialActivities={activities ?? []} />;
}
