export type CertificateTemplate = "purple" | "white";

export interface CertTheme {
  // Container
  background: string;
  boxShadow: string;
  // Border layers
  outerBorder: string;
  midBorder: string;
  innerBorder: string;
  // Corner brackets + diamond accents
  cornerColor: string;
  // Text colors
  titleColor: string;         // church name, cert title, minister name, date value
  nameColor: string;          // child name — primary focal point
  subtitleColor: string;      // tagline, cert subtitle, church name in footer
  dimColor: string;           // section labels (PRESENTED BY / DATE OF PRESENTATION)
  scriptureTextColor: string; // scripture verse body
  scriptureRefColor: string;  // scripture reference line (reference + translation label)
  blessingColor: string;      // personalized blessing text
  // Dividers and ornaments
  dividerColor: string;       // thin horizontal rules
  ornamentColor: string;      // ❖ glyphs
  // Scripture medallion box
  medallionBackground: string;
  medallionBorder: string;
  // Church logo area placeholder (rectangular)
  logoAreaBorder: string;
  logoAreaBackground: string;
  logoAreaLabelColor: string;
  // Ministry seal (circular cross placeholder)
  sealBorder: string;
  sealBackground: string;
  // Top accent (above church logo)
  topAccentType: "cross-glow" | "crown";
  topAccentColor: string;      // color of the ✝ cross; empty string when topAccentType is "crown"
  crossGlowTextShadow: string; // CSS textShadow for glowing cross; empty string for Ivory
  // Child name
  nameTextShadow: string;      // optional CSS textShadow for child name; empty string disables
  // Birthday motif balloon palette
  motifBalloon1: string;       // left balloon
  motifBalloon2: string;       // center balloon (typically gold/accent)
  motifBalloon3: string;       // right balloon
  motifStringColor: string;    // balloon strings
  motifShineColor: string;     // balloon shine highlights
}

const PURPLE_THEME: CertTheme = {
  background:            "linear-gradient(160deg, #050212 0%, #130828 50%, #0A0320 100%)",
  boxShadow:             "0 8px 56px rgba(5,2,18,0.80), 0 0 120px rgba(212,175,55,0.04)",
  outerBorder:           "3px solid #D4AF37",
  midBorder:             "1px solid rgba(212,175,55,0.55)",
  innerBorder:           "1px solid rgba(212,175,55,0.18)",
  cornerColor:           "#D4AF37",
  titleColor:            "#D4AF37",
  nameColor:             "#FFFFFF",
  subtitleColor:         "rgba(212,175,55,0.72)",
  dimColor:              "rgba(255,255,255,0.40)",
  scriptureTextColor:    "rgba(255,255,255,0.72)",
  scriptureRefColor:     "#D4AF37",
  blessingColor:         "rgba(255,255,255,0.55)",
  dividerColor:          "rgba(212,175,55,0.28)",
  ornamentColor:         "rgba(212,175,55,0.58)",
  medallionBackground:   "rgba(212,175,55,0.05)",
  medallionBorder:       "rgba(212,175,55,0.24)",
  logoAreaBorder:        "rgba(212,175,55,0.38)",
  logoAreaBackground:    "rgba(212,175,55,0.04)",
  logoAreaLabelColor:    "rgba(212,175,55,0.45)",
  sealBorder:            "rgba(212,175,55,0.55)",
  sealBackground:        "rgba(5,2,18,0.90)",
  topAccentType:         "cross-glow",
  topAccentColor:        "#D4AF37",
  crossGlowTextShadow:   "0 0 18px rgba(212,175,55,0.70), 0 0 40px rgba(212,175,55,0.30)",
  nameTextShadow:        "",
  motifBalloon1:         "#9D4EDD",
  motifBalloon2:         "#D4AF37",
  motifBalloon3:         "#7B2CBF",
  motifStringColor:      "rgba(212,175,55,0.55)",
  motifShineColor:       "rgba(255,255,255,0.20)",
};

const IVORY_THEME: CertTheme = {
  background:            "#FDFAEF",
  boxShadow:             "0 4px 28px rgba(0,0,0,0.09)",
  outerBorder:           "2.5px solid #8B6914",
  midBorder:             "1px solid rgba(175,135,40,0.50)",
  innerBorder:           "1px solid rgba(175,135,40,0.28)",
  cornerColor:           "#8B6914",
  titleColor:            "#1C0A2E",
  nameColor:             "#1C0A2E",
  subtitleColor:         "#8B6914",
  dimColor:              "#8B7355",
  scriptureTextColor:    "#4A3728",
  scriptureRefColor:     "#8B6914",
  blessingColor:         "#5C4A3A",
  dividerColor:          "rgba(175,135,40,0.38)",
  ornamentColor:         "#B8860B",
  medallionBackground:   "rgba(139,105,20,0.05)",
  medallionBorder:       "rgba(139,105,20,0.32)",
  logoAreaBorder:        "rgba(139,105,20,0.42)",
  logoAreaBackground:    "rgba(139,105,20,0.04)",
  logoAreaLabelColor:    "rgba(139,105,20,0.52)",
  sealBorder:            "rgba(139,105,20,0.58)",
  sealBackground:        "rgba(253,250,239,0.95)",
  topAccentType:         "crown",
  topAccentColor:        "",
  crossGlowTextShadow:   "",
  nameTextShadow:        "",
  motifBalloon1:         "#5B1E8C",
  motifBalloon2:         "#B8860B",
  motifBalloon3:         "#8B4513",
  motifStringColor:      "rgba(100,50,10,0.50)",
  motifShineColor:       "rgba(255,255,255,0.40)",
};

export function getCertificateTheme(template: CertificateTemplate): CertTheme {
  return template === "purple" ? PURPLE_THEME : IVORY_THEME;
}
