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

// ── Backgrounds ───────────────────────────────────────────────────────────────
//
// CSS multi-layer background (front → back, comma-separated).
// Pure CSS gradients only — no SVG data URLs, no external images.
// All layers use radial-gradient / linear-gradient for html2canvas compatibility.
// Opacity budget per layer kept to 2–6 % so no single layer reads as artwork.

const PURPLE_BACKGROUND = [
  // 1. Strong corner vignette — deep darkness pulled in from all edges
  "radial-gradient(ellipse at center, transparent 30%, rgba(1,0,8,0.72) 100%)",
  // 2. Lower-left soft purple glow — rich atmospheric depth at bottom corner
  "radial-gradient(ellipse 62% 52% at -4% 104%, rgba(68,10,115,0.52) 0%, transparent 65%)",
  // 3. Lower-right soft purple glow — mirrors lower-left
  "radial-gradient(ellipse 62% 52% at 104% 104%, rgba(68,10,115,0.52) 0%, transparent 65%)",
  // 4. Left balloon-region purple bloom
  "radial-gradient(ellipse 50% 40% at 2% 8%, rgba(88,28,135,0.09) 0%, transparent 100%)",
  // 5. Right balloon-region purple bloom
  "radial-gradient(ellipse 50% 40% at 98% 8%, rgba(88,28,135,0.09) 0%, transparent 100%)",
  // 6. Atmospheric depth ring — center-safe, darkens outer area to purple
  "radial-gradient(ellipse 88% 72% at 50% 50%, transparent 36%, rgba(18,2,40,0.32) 100%)",
  // 7. Faint upper purple haze along top edge
  "radial-gradient(ellipse 100% 32% at 50% 0%, rgba(48,8,82,0.14) 0%, transparent 100%)",
  // 8. Gold dust — arc rings from upper-left off-screen
  "repeating-radial-gradient(circle at -12% -15%, transparent 0%, transparent 5.8%, rgba(212,175,55,0.016) 6.1%, transparent 6.4%)",
  // 9. Gold dust — arc rings from lower-right off-screen (two-point interference → scattered texture)
  "repeating-radial-gradient(circle at 112% 118%, transparent 0%, transparent 7.6%, rgba(212,175,55,0.013) 7.9%, transparent 8.2%)",
  // 10. Base gradient — deep purple
  "linear-gradient(160deg, #050212 0%, #130828 50%, #0A0320 100%)",
].join(", ");

const IVORY_BACKGROUND = [
  // 1. Warm sepia vignette — gentle darkness toward corners on light paper
  "radial-gradient(ellipse at center, transparent 42%, rgba(80,50,5,0.14) 100%)",
  // 2. Left warm bloom — amber light behind upper-left balloon cluster
  "radial-gradient(ellipse 48% 36% at 2% 8%, rgba(160,110,15,0.045) 0%, transparent 100%)",
  // 3. Right warm bloom
  "radial-gradient(ellipse 48% 36% at 98% 8%, rgba(160,110,15,0.045) 0%, transparent 100%)",
  // 4. Lower warmth — slight amber pooling at bottom, away from name
  "radial-gradient(ellipse 40% 28% at 50% 78%, rgba(130,90,10,0.028) 0%, transparent 100%)",
  // 5–10. Amber glint points — CSS-only substitute for SVG dust particles
  "radial-gradient(circle at 8% 19%,  rgba(139,105,20,0.040) 0%, transparent 1.2%)",
  "radial-gradient(circle at 56% 11%, rgba(139,105,20,0.034) 0%, transparent 1.0%)",
  "radial-gradient(circle at 91% 43%, rgba(139,105,20,0.036) 0%, transparent 1.1%)",
  "radial-gradient(circle at 32% 74%, rgba(139,105,20,0.030) 0%, transparent 1.0%)",
  "radial-gradient(circle at 78% 82%, rgba(139,105,20,0.034) 0%, transparent 1.2%)",
  "radial-gradient(circle at 64% 54%, rgba(139,105,20,0.026) 0%, transparent 0.9%)",
  // 11. Base — original cream
  "#FDFAEF",
].join(", ");

// ── Theme objects ─────────────────────────────────────────────────────────────

const PURPLE_THEME: CertTheme = {
  background:            PURPLE_BACKGROUND,
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
  medallionBackground:   "rgba(212,175,55,0.03)",
  medallionBorder:       "rgba(212,175,55,0.14)",
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
  background:            IVORY_BACKGROUND,
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
  medallionBackground:   "rgba(139,105,20,0.03)",
  medallionBorder:       "rgba(139,105,20,0.18)",
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
