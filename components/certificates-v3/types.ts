export type CertTemplate = "premium" | "classic" | "minimal";
export type CertTranslation = "kjv" | "niv";

export interface CertificateData {
  certType: string;
  template: CertTemplate;
  childName: string;
  churchName?: string;
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