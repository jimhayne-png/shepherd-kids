"use client";

import { createContext, useContext } from "react";
import { getCertificateTheme, CertTheme, CertificateTemplate } from "@/lib/certificates/themes";

const CertificateThemeContext = createContext<CertTheme | null>(null);

export function CertificateThemeProvider({
  template,
  children,
}: {
  template: CertificateTemplate;
  children: React.ReactNode;
}) {
  const theme = getCertificateTheme(template);
  return (
    <CertificateThemeContext.Provider value={theme}>
      {children}
    </CertificateThemeContext.Provider>
  );
}

export function useCertificateTheme(): CertTheme {
  const theme = useContext(CertificateThemeContext);
  if (!theme) {
    throw new Error("useCertificateTheme must be used inside CertificateThemeProvider");
  }
  return theme;
}
