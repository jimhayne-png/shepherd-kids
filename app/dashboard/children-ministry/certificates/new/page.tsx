"use client";

import CertificateCanvas from "@/components/certificates-v3/CertificateCanvas";
import { sampleCertificateData } from "@/components/certificates-v3/data/sampleCertificateData";

export default function CertificateNewPage() {
  return (
    <div style={{ padding: "32px", backgroundColor: "#08060D", minHeight: "100vh" }}>
      <p style={{ fontSize: "11px", fontWeight: 700, color: "#D4AF37", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 20px", fontFamily: "monospace" }}>
        certificates-v3 · architecture proof
      </p>
      <div style={{ maxWidth: "860px" }}>
        <CertificateCanvas data={sampleCertificateData} />
      </div>
    </div>
  );
}
