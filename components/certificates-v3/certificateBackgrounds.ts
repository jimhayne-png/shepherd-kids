// Certificate background image registry.
// Maps cert type key + template ("premium" | "classic" | "minimal") to a static image path in
// public/certificates/backgrounds/.
//
// UI template names:
// Premium Colors (template === "premium"): *-premium-landscape.png
// Classic        (template === "classic"): *-classic-landscape.png
// Minimal        (template === "minimal"): *-traditional-landscape.png

const BASE = "/certificates/backgrounds";

const FALLBACK = `${BASE}/birthday-premium-landscape.png`;

const CERT_TYPE_SLUG: Record<string, string> = {
  birthday: "birthday",
  spiritual_birthday: "spiritual-birthday",
  baptism: "baptism",
  faith_milestone: "faith-milestone",
  scripture_memory: "scripture-memory",
  attendance: "attendance-award",
  kindness: "kindness-award",
  servant_heart: "servant-heart",
  helper: "helper-award",
  promotion: "promotion-sunday",
};

const TEMPLATE_SLUG: Record<string, string> = {
  premium: "premium",
  classic: "classic",
  minimal: "traditional",
};

function getRegisteredBackgroundPath(
  certType: string,
  template: string
): string | null {
  const typeSlug = CERT_TYPE_SLUG[certType];
  const tplSlug = TEMPLATE_SLUG[template];

  if (!typeSlug || !tplSlug) return null;

  if (certType === "servant_heart" && template === "premium") {
    return `${BASE}/servant-heart-premium-landscape.png`;
  }

  return `${BASE}/${typeSlug}-${tplSlug}-landscape.png`;
}

export function getCertBackground(certType: string, template: string): string {
  const path = getRegisteredBackgroundPath(certType, template);

  if (!CERT_TYPE_SLUG[certType]) {
    console.warn(
      `[ShepherdKids] No background registered for certType "${certType}" — using fallback.`
    );
    return FALLBACK;
  }

  if (!TEMPLATE_SLUG[template]) {
    console.warn(
      `[ShepherdKids] Unknown template "${template}" for certType "${certType}" — defaulting to Premium Colors.`
    );
    return `${BASE}/${CERT_TYPE_SLUG[certType]}-premium-landscape.png`;
  }

  return path ?? FALLBACK;
}

export const ALL_BACKGROUND_PATHS: string[] = Object.keys(CERT_TYPE_SLUG).flatMap(
  certType =>
    Object.keys(TEMPLATE_SLUG)
      .map(template => getRegisteredBackgroundPath(certType, template))
      .filter((path): path is string => Boolean(path))
);