import ScanClient from './ScanClient';

export default async function KioskScanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ScanClient token={token} />;
}
