"use client";

import CertificateCanvas from "@/components/certificates/CertificateCanvas";
import type { CertificateTemplate } from "@/lib/certificates/themes";

export interface BirthdayCertificateProps {
  template: CertificateTemplate;
  churchName: string;
  churchTagline?: string;
  logoUrl?: string;
  childName: string;
  verse: string;
  reference: string;
  translation: "kjv" | "niv";
  blessing: string;
  ministerName: string;
  ministerTitle: string;
  date: string;
  sealImageUrl?: string;
}

export default function BirthdayCertificate(props: BirthdayCertificateProps) {
  return (
    <CertificateCanvas
      template={props.template}
      certType="birthday"
      churchName={props.churchName}
      churchTagline={props.churchTagline}
      certificateTitle="Birthday Celebration"
      certificateSubtitle="Celebrating God’s Wonderful Gift of Life"
      childName={props.childName}
      verse={props.verse}
      reference={props.reference}
      translation={props.translation}
      blessing={props.blessing}
      ministerName={props.ministerName}
      ministerTitle={props.ministerTitle}
      date={props.date}
      sealImageUrl={props.sealImageUrl}
    />
  );
}
