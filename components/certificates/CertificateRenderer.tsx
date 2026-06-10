"use client";

import BirthdayCertificate from "@/components/certificates/BirthdayCertificate";
import type { BirthdayCertificateProps } from "@/components/certificates/BirthdayCertificate";

export interface CertificateRendererProps extends Omit<BirthdayCertificateProps, never> {
  certType: string;
}

export default function CertificateRenderer({ certType: _certType, ...props }: CertificateRendererProps) {
  // Only birthday is built. All other certTypes temporarily fall through here
  // until their dedicated components are created in future milestones.
  return <BirthdayCertificate {...props} />;
}
