"use client";

import { useRef } from "react";
import AppShell from "@/components/layout/AppShell";
import CertificateRenderer from "@/components/certificates/CertificateRenderer";
import CertificateExportButtons from "@/components/certificates/CertificateExportButtons";
import { CertificateThemeProvider } from "@/components/certificates/context/CertificateThemeContext";

const SAMPLE = {
  certType:      "birthday",
  churchName:    "Grace Community Church",
  churchTagline: "Loving God • Loving People • Making Disciples",
  childName:     "Emma Johnson",
  ministerName:  "Pastor Michael Anderson",
  ministerTitle: "Children's Ministry Director",
  date:          "2026-06-10",
  translation:   "kjv" as const,
  reference:     "Psalm 139:13–14",
  verse:         `"For thou hast possessed my reins: thou hast covered me in my mother's womb. I will praise thee; for I am fearfully and wonderfully made: marvellous are thy works; and that my soul knoweth right well."`,
  blessing:      "May God continue to bless your life with joy, wisdom, courage, and faith as you grow in His love.",
};

export default function CertDevPreviewPage() {
  const purpleRef = useRef<HTMLDivElement>(null);
  const ivoryRef  = useRef<HTMLDivElement>(null);

  return (
    <AppShell navItems={[]}>
      <div style={{ padding: "32px 40px", backgroundColor: "#0A0814", minHeight: "100vh" }}>

        {/* Page header */}
        <div style={{ marginBottom: "40px", paddingBottom: "20px", borderBottom: "1px solid rgba(212,175,55,0.15)" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "#D4AF37", textTransform: "uppercase", margin: "0 0 6px" }}>
            Dev Preview · Certificate Engine
          </p>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#ffffff", margin: 0, fontFamily: "Georgia, serif" }}>
            Certificate Design Preview
          </h1>
          <p style={{ fontSize: "13px", color: "#A9A9B8", margin: "8px 0 0", lineHeight: 1.5 }}>
            Internal review only — not linked from production navigation.
          </p>
        </div>

        {/* Certificate previews */}
        <div style={{ display: "flex", flexDirection: "column", gap: "52px" }}>

          {/* Royal Purple Premium */}
          <section>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "#D4AF37", textTransform: "uppercase", margin: "0 0 14px" }}>
              Royal Purple Premium
            </p>
            <div ref={purpleRef} style={{ maxWidth: "860px" }}>
              <CertificateThemeProvider template="purple">
                <CertificateRenderer {...SAMPLE} template="purple" />
              </CertificateThemeProvider>
            </div>
            <div style={{ maxWidth: "860px" }}>
              <CertificateExportButtons
                certRef={purpleRef}
                filename="birthday-certificate-purple"
              />
            </div>
          </section>

          {/* Classic Ivory Premium */}
          <section>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "#8B6914", textTransform: "uppercase", margin: "0 0 14px" }}>
              Classic Ivory Premium
            </p>
            <div ref={ivoryRef} style={{ maxWidth: "860px" }}>
              <CertificateThemeProvider template="white">
                <CertificateRenderer {...SAMPLE} template="white" />
              </CertificateThemeProvider>
            </div>
            <div style={{ maxWidth: "860px" }}>
              <CertificateExportButtons
                certRef={ivoryRef}
                filename="birthday-certificate-ivory"
              />
            </div>
          </section>

        </div>
      </div>
    </AppShell>
  );
}
