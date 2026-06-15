"use client";

import PremiumCertificateLayout from "@/components/certificates/PremiumCertificateLayout";
import BirthdayMotif from "@/components/certificates/motifs/BirthdayMotif";
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
    <PremiumCertificateLayout
      template={props.template}
      churchName={props.churchName}
      churchTagline={props.churchTagline}
      logoUrl={props.logoUrl}
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
      renderMotif={(side) => <BirthdayMotif side={side} size={220} />}
    />
  );
}