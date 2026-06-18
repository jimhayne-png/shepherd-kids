export type CertTemplate = "purple" | "white";
export type CertTranslation = "kjv" | "niv";

export interface CertificateData {
  certType: string;
  template: CertTemplate;
  childName: string;
  churchName?: string;
  churchTagline?: string;
  ministerName?: string;
  ministerTitle?: string;
  date?: string;
  verse?: string;
  reference?: string;
  translation?: CertTranslation;
  blessing?: string;
  logoUrl?: string;
  sealImageUrl?: string;
}
