import { adminClient } from '@/lib/api-auth';
import RoomPinGate from './RoomPinGate';

export default async function RoomViewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const admin = adminClient();

  const { data: session } = await admin
    .from('cm_checkin_sessions')
    .select('id, service_name, date, kiosk_pin')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Session Not Found</h1>
          <p className="text-gray-500 text-sm">This session link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <RoomPinGate
      sessionId={session.id}
      serviceName={session.service_name}
      date={session.date}
      pin={session.kiosk_pin}
    />
  );
}
