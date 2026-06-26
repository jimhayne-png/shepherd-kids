// Certificate background image registry.
// Maps cert type key + template ("purple" | "white") to a static image path in
// public/certificates/backgrounds/.
//
// Premium backgrounds (template === "purple"):  *-premium-landscape.png
// Classic backgrounds (template === "white"):   *-classic-landscape.png
//
// To add a new cert type: add an entry to CERT_TYPE_SLUG and drop the two PNG
// files (premium + classic) into public/certificates/backgrounds/.

const BASE = "/certificates/backgrounds";

const FALLBACK = `${BASE}/birthday-premium-landscape.png`;

// Maps CertificateData.certType → the filename slug used for that type.
const CERT_TYPE_SLUG: Record<string, string> = {
  birthday:          "birthday",
  spiritual_birthday:"spiritual-birthday",
  baptism:           "baptism",
  faith_milestone:   "faith-milestone",
  scripture_memory:  "scripture-memory",
  attendance:        "attendance-award",
  kindness:          "kindness-award",
  servant_heart:     "servant-heart",
  helper:            "helper-award",
  promotion:         "promotion-sunday",
};

// Maps CertificateData.template → the style label in the filename.
const TEMPLATE_SLUG: Record<string, string> = {
  purple: "premium",
  white:  "classic",
};

/**
 * Returns the absolute-path URL for the background image that corresponds to
 * the given cert type + template combination.
 *
 * Falls back to the birthday-premium image and console.warns when:
 *   • certType is not in the registry, or
 *   • template is unrecognised.
 *
 * Note: this function only constructs the expected path. The image may still be
 * absent from disk; the StaticCertificateCanvas component handles that case with
 * an onError handler that falls back to the layered V3 renderer.
 */
export function getCertBackground(certType: string, template: string): string {
  const typeSlug = CERT_TYPE_SLUG[certType];
  const tplSlug  = TEMPLATE_SLUG[template];

  if (!typeSlug) {
    console.warn(
      `[ShepherdKids] No background registered for certType "${certType}" — using fallback.`
    );
    return FALLBACK;
  }

  if (!tplSlug) {
    console.warn(
      `[ShepherdKids] Unknown template "${template}" for certType "${certType}" — defaulting to premium.`
    );
    return `${BASE}/${typeSlug}-premium-landscape.png`;
  }

  return `${BASE}/${typeSlug}-${tplSlug}-landscape.png`;
}

// All 20 expected background paths — useful for pre-loading or audit checks.
export const ALL_BACKGROUND_PATHS: string[] = Object.keys(CERT_TYPE_SLUG).flatMap(
  (certType) =>
    Object.keys(TEMPLATE_SLUG).map((template) => getCertBackground(certType, template))
);
