import { adminClient } from '@/lib/api-auth';
import ClassroomSignIn from './ClassroomSignIn';

export default async function ClassroomPage({
  params,
}: {
  params: Promise<{ roomQrToken: string }>;
}) {
  const { roomQrToken } = await params;
  const admin = adminClient();

  const { data: room } = await admin
    .from('cm_checkin_rooms')
    .select('name, church_id')
    .eq('classroom_qr_token', roomQrToken)
    .maybeSingle();

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Invalid Classroom Code</h1>
          <p className="text-gray-500 text-sm">This QR code is not recognized.</p>
        </div>
      </div>
    );
  }

  const { data: church } = await admin
    .from('churches')
    .select('name')
    .eq('id', room.church_id)
    .maybeSingle();

  const churchName = (church as { name: string } | null)?.name ?? 'Your Church';

  return (
    <ClassroomSignIn
      churchId={room.church_id}
      roomQrToken={roomQrToken}
      roomName={room.name}
      churchName={churchName}
    />
  );
}
