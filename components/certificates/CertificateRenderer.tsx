"use client";

import BirthdayCertificate from "@/components/certificates/BirthdayCertificate";
import type { BirthdayCertificateProps } from "@/components/certificates/BirthdayCertificate";

export interface CertificateRendererProps extends Omit<BirthdayCertificateProps, never> {
  certType: string;
}

export default function CertificateRenderer({ certType: _certType, ...props }: CertificateRendererProps) {
  return <BirthdayCertificate {...props} />;
}
