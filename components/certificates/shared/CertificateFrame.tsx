"use client";

import {
  CertificateThemeProvider,
  useCertificateTheme,
} from "@/components/certificates/context/CertificateThemeContext";
import { CertificateTemplate } from "@/lib/certificates/themes";

function CertificateFrameInner({ children }: { children: React.ReactNode }) {
  const theme = useCertificateTheme();
  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "11 / 8.5",
        width: "100%",
        boxSizing: "border-box",
        background: theme.background,
        border: theme.outerBorder,
        borderRadius: "4px",
        boxShadow: theme.boxShadow,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

export default function CertificateFrame({
  template,
  children,
}: {
  template: CertificateTemplate;
  children: React.ReactNode;
}) {
  return (
    <CertificateThemeProvider template={template}>
      <CertificateFrameInner>{children}</CertificateFrameInner>
    </CertificateThemeProvider>
  );
}
