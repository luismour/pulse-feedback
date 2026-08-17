import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import ActivityAdminTabs from '@/components/admin/ActivityAdminTabs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ActivityAdminPage({
  params,
}: {
  params: { eventId: string; activityId: string };
}) {
  if (!params?.activityId) notFound();

  const supabase = supabaseServer();
  const { data: activity } = await supabase
    .from('activities')
    .select('*')
    .eq('id', params.activityId)
    .maybeSingle();
  if (!activity) notFound();

  return <ActivityAdminTabs eventId={params.eventId} activity={activity} />;
}
