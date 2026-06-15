export type CertificateTemplate = "purple" | "white";

export interface CertTheme {
  background: string;
  boxShadow: string;

  outerBorder: string;
  midBorder: string;
  innerBorder: string;

  cornerColor: string;

  titleColor: string;
  nameColor: string;
  subtitleColor: string;
  dimColor: string;
  scriptureTextColor: string;
  scriptureRefColor: string;
  blessingColor: string;

  dividerColor: string;
  ornamentColor: string;

  medallionBackground: string;
  medallionBorder: string;

  logoAreaBorder: string;
  logoAreaBackground: string;
  logoAreaLabelColor: string;

  sealBorder: string;
  sealBackground: string;

  topAccentType: "cross-glow" | "crown";
  topAccentColor: string;
  crossGlowTextShadow: string;

  nameTextShadow: string;

  motifBalloon1: string;
  motifBalloon2: string;
  motifBalloon3: string;
  motifStringColor: string;
  motifShineColor: string;
}

const PURPLE_BACKGROUND = [
  "radial-gradient(circle at 50% 8%, rgba(255,240,180,.24) 0%, transparent 12%)",
  "radial-gradient(circle at 50% 20%, rgba(150,80,255,.22) 0%, transparent 32%)",
  "radial-gradient(circle at 12% 82%, rgba(123,44,191,.20) 0%, transparent 42%)",
  "radial-gradient(circle at 88% 82%, rgba(123,44,191,.20) 0%, transparent 42%)",
  "radial-gradient(circle at 0% 50%, rgba(212,175,55,.12) 0%, transparent 24%)",
  "radial-gradient(circle at 100% 50%, rgba(212,175,55,.12) 0%, transparent 24%)",
  "radial-gradient(circle at 18% 18%, rgba(255,255,255,.05), transparent 2%)",
  "radial-gradient(circle at 82% 15%, rgba(255,255,255,.05), transparent 2%)",
  "radial-gradient(circle at 72% 72%, rgba(255,255,255,.04), transparent 2%)",
  "radial-gradient(circle at 28% 76%, rgba(255,255,255,.04), transparent 2%)",
  "repeating-radial-gradient(circle at center, transparent 0px, transparent 36px, rgba(212,175,55,.012) 38px, transparent 40px)",
  "linear-gradient(180deg,#030109 0%,#120520 40%,#180728 70%,#05010B 100%)",
].join(", ");

const IVORY_BACKGROUND = [
  "radial-gradient(circle at 50% 18%, rgba(255,255,255,.95), transparent 40%)",
  "radial-gradient(circle at 0% 100%, rgba(212,175,55,.09), transparent 34%)",
  "radial-gradient(circle at 100% 100%, rgba(123,44,191,.05), transparent 30%)",
  "radial-gradient(circle at 18% 20%, rgba(212,175,55,.03), transparent 2%)",
  "radial-gradient(circle at 82% 14%, rgba(212,175,55,.03), transparent 2%)",
  "radial-gradient(circle at 66% 84%, rgba(212,175,55,.03), transparent 2%)",
  "repeating-radial-gradient(circle at center, transparent 0px, transparent 42px, rgba(139,105,20,.012) 44px, transparent 46px)",
  "linear-gradient(180deg,#FFFDF7 0%,#FDF8EB 42%,#F7EFD7 100%)",
].join(", ");

const PURPLE_THEME: CertTheme = {
  background: PURPLE_BACKGROUND,
  boxShadow: "0 24px 70px rgba(0,0,0,.65)",

  outerBorder: "4px solid #D4AF37",
  midBorder: "2px solid rgba(248,230,160,.70)",
  innerBorder: "1px solid rgba(212,175,55,.22)",

  cornerColor: "#D4AF37",

  titleColor: "#D4AF37",
  nameColor: "#FFFFFF",
  subtitleColor: "rgba(248,230,160,.82)",
  dimColor: "rgba(255,255,255,.48)",
  scriptureTextColor: "rgba(255,255,255,.78)",
  scriptureRefColor: "#D4AF37",
  blessingColor: "rgba(255,255,255,.68)",

  dividerColor: "rgba(212,175,55,.36)",
  ornamentColor: "rgba(212,175,55,.72)",

  medallionBackground: "rgba(8,3,16,.82)",
  medallionBorder: "rgba(212,175,55,.45)",

  logoAreaBorder: "rgba(212,175,55,.42)",
  logoAreaBackground: "rgba(212,175,55,.04)",
  logoAreaLabelColor: "rgba(212,175,55,.55)",

  sealBorder: "rgba(248,230,160,.75)",
  sealBackground: "rgba(5,2,18,.95)",

  topAccentType: "cross-glow",
  topAccentColor: "#F8E6A0",
  crossGlowTextShadow:
    "0 0 15px rgba(255,255,255,.85), 0 0 36px rgba(197,111,255,.75), 0 0 90px rgba(170,70,255,.45)",

  nameTextShadow:
    "0 2px 0 rgba(143,107,0,.95), 0 4px 10px rgba(0,0,0,.48), 0 0 34px rgba(212,175,55,.18)",

  motifBalloon1: "#9D4EDD",
  motifBalloon2: "#D4AF37",
  motifBalloon3: "#5A189A",
  motifStringColor: "rgba(212,175,55,.68)",
  motifShineColor: "rgba(255,255,255,.34)",
};

const IVORY_THEME: CertTheme = {
  background: IVORY_BACKGROUND,
  boxShadow: "0 24px 70px rgba(0,0,0,.18)",

  outerBorder: "4px solid #8B6914",
  midBorder: "2px solid rgba(212,175,55,.62)",
  innerBorder: "1px solid rgba(139,105,20,.26)",

  cornerColor: "#8B6914",

  titleColor: "#1C0A30",
  nameColor: "#1C0A30",
  subtitleColor: "#8B6914",
  dimColor: "#8B7355",
  scriptureTextColor: "#4A3728",
  scriptureRefColor: "#8B6914",
  blessingColor: "#5C4A3A",

  dividerColor: "rgba(139,105,20,.42)",
  ornamentColor: "#B8860B",

  medallionBackground: "rgba(255,255,255,.82)",
  medallionBorder: "rgba(139,105,20,.30)",

  logoAreaBorder: "rgba(139,105,20,.42)",
  logoAreaBackground: "rgba(139,105,20,.04)",
  logoAreaLabelColor: "rgba(139,105,20,.52)",

  sealBorder: "rgba(139,105,20,.62)",
  sealBackground: "rgba(253,250,239,.96)",

  topAccentType: "crown",
  topAccentColor: "",
  crossGlowTextShadow: "",

  nameTextShadow: "0 1px 0 #FFFFFF, 0 3px 9px rgba(139,105,20,.12)",

  motifBalloon1: "#5B1E8C",
  motifBalloon2: "#B8860B",
  motifBalloon3: "#8B4513",
  motifStringColor: "rgba(100,50,10,.55)",
  motifShineColor: "rgba(255,255,255,.42)",
};

export function getCertificateTheme(template: CertificateTemplate): CertTheme {
  return template === "purple" ? PURPLE_THEME : IVORY_THEME;
}