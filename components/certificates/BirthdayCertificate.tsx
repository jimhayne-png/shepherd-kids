"use client";

import CertificateFrame    from "@/components/certificates/shared/CertificateFrame";
import CertificateHeader   from "@/components/certificates/shared/CertificateHeader";
import CertificateRibbon   from "@/components/certificates/shared/CertificateRibbon";
import CertificateName     from "@/components/certificates/shared/CertificateName";
import CertificateScripture from "@/components/certificates/shared/CertificateScripture";
import CertificateBlessing from "@/components/certificates/shared/CertificateBlessing";
import CertificateFooter   from "@/components/certificates/shared/CertificateFooter";
import BirthdayMotif       from "@/components/certificates/motifs/BirthdayMotif";
import { useCertificateTheme } from "@/components/certificates/context/CertificateThemeContext";
import type { CertificateTemplate } from "@/lib/certificates/themes";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface BirthdayCertificateProps {
  template: CertificateTemplate;
  // Church identity
  churchName: string;
  churchTagline?: string;
  logoUrl?: string;
  // Child
  childName: string;
  // Scripture
  verse: string;
  reference: string;
  translation: "kjv" | "niv";
  // Optional blessing
  blessing: string;
  // Footer
  ministerName: string;
  ministerTitle: string;
  date: string;
  sealImageUrl?: string;
}

type ContentProps = Omit<BirthdayCertificateProps, "template">;

// ── Inner content (runs inside CertificateThemeProvider) ──────────────────────

function BirthdayCertificateContent(props: ContentProps) {
  const theme = useCertificateTheme();

  return (
    <div style={{ position: "relative", textAlign: "center", padding: "30px 44px 26px" }}>

      {/* Church identity */}
      <CertificateHeader
        churchName={props.churchName}
        churchTagline={props.churchTagline}
        logoUrl={props.logoUrl}
      />

      {/* ❖ ❖ ❖ ornamental rule */}
      <CertificateRibbon variant="triple" />

      {/* Birthday motif */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "4px" }}>
        <BirthdayMotif side="center" />
      </div>

      {/* Certificate title */}
      <h2 style={{
        fontSize: "22px",
        fontWeight: 700,
        color: theme.titleColor,
        fontFamily: "Georgia, serif",
        letterSpacing: "0.06em",
        textTransform: "uppercase" as const,
        margin: "0 0 2px",
      }}>
        BIRTHDAY CELEBRATION
      </h2>

      {/* Certificate subtitle */}
      <p style={{
        fontSize: "13px",
        color: theme.subtitleColor,
        fontStyle: "italic",
        letterSpacing: "0.04em",
        margin: "0 0 2px",
      }}>
        Celebrating the Wonderful Gift God Has Given
      </p>

      {/* ◆ ribbon divider */}
      <CertificateRibbon variant="diamond" />

      {/* Child name — primary visual focal point */}
      <CertificateName childName={props.childName} />

      {/* Rule below name */}
      <div style={{ height: "1px", background: theme.dividerColor, margin: "0 8% 14px" }} />

      {/* Scripture medallion */}
      <CertificateScripture
        verse={props.verse}
        reference={props.reference}
        translation={props.translation}
      />

      {/* Personalized blessing — hidden when empty */}
      <CertificateBlessing blessing={props.blessing} />

      {/* ❖ closing rule */}
      <CertificateRibbon variant="single" />

      {/* Footer: Presented By | Seal | Date */}
      <CertificateFooter
        ministerName={props.ministerName}
        ministerTitle={props.ministerTitle}
        churchName={props.churchName}
        date={props.date}
        sealImageUrl={props.sealImageUrl}
      />

    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export default function BirthdayCertificate({ template, ...rest }: BirthdayCertificateProps) {
  return (
    <CertificateFrame template={template}>
      <BirthdayCertificateContent {...rest} />
    </CertificateFrame>
  );
}
