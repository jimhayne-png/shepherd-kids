import { adminClient } from '@/lib/api-auth';
import VolunteerPinGate from './VolunteerPinGate';

export default async function VolunteerPage({
  params,
}: {
  params: Promise<{ churchId: string }>;
}) {
  const { churchId } = await params;
  const admin = adminClient();

  const { data: church } = await admin
    .from('churches')
    .select('id, name')
    .eq('id', churchId)
    .maybeSingle();

  if (!church) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Church Not Found</h1>
          <p className="text-gray-500 text-sm">This volunteer link is invalid.</p>
        </div>
      </div>
    );
  }

  return <VolunteerPinGate churchId={church.id} churchName={church.name} />;
}
