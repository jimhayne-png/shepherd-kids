# ShepherdKids Certificate Design Framework v1.0

**Status:** Authoritative — Source of Truth  
**Applies to:** `components/certificates/` and `app/dashboard/children-ministry/certificates/`

---

## Governing Rule

The ShepherdKids Certificate Design Framework is the authoritative standard for all certificate rendering. The Birthday Certificate is the master reference design. All future certificates must inherit its visual language, typography, spacing, hierarchy, border system, logo placement, scripture placement, blessing placement, footer structure, and print behavior.

Future certificate types **may change only:**
- Title
- Subtitle
- Scripture
- Motif
- Blessing presets
- Certificate-specific icon or artwork

Future certificate types **may NOT change:**
- Master layout
- Typography hierarchy
- Child name placement
- Church branding placement
- Scripture box placement
- Footer structure
- Border system
- Print rules

---

## Design Philosophy

Certificates must communicate:

- Honor
- Celebration
- Excellence
- Spiritual significance
- Timeless elegance

Certificates must never resemble:

- School worksheets
- PowerPoint slides
- Church bulletins
- Clip art
- Generic Canva templates

Every certificate should look premium enough that parents immediately want to frame it.

---

## Master Templates

Exactly two master templates exist. No new templates may be added without updating this framework.

### Royal Purple Premium

Luxury. Dark royal purple background. Metallic gold borders. White and gold typography. Rich ceremonial feel.

### Classic Ivory Premium

Traditional. Warm ivory parchment. Deep gold ornamentation. Classic church heritage feel. Timeless presentation.

Every certificate in the system uses one of these two master templates. Only content changes. The layout language remains consistent.

---

## Architecture Principles

**Theme-first, not component-first.**  
The two templates are not separate components — they are two states of the same design system. Every component is theme-aware through context, not through conditional props scattered throughout the tree.

**Content in, pixels out.**  
Each certificate component receives only content data. It never decides what it looks like — that comes from the theme context.

**CertificateBorder is infrastructure, not content.**  
Borders, corner ornaments, and decorative layers are absolutely-positioned overlays. They never participate in document flow and never affect content positioning.

**One motif per certificate type, completely decoupled.**  
`BirthdayMotif` has no knowledge of certificates. `BirthdayCertificate` imports it. They are separate concerns.

**CertificateRenderer is the only component that branches on certificate type.**  
No shared component ever inspects `certType`. The renderer selects the correct composition and passes data in.

---

## File Structure

```
components/certificates/
│
├── context/
│   └── CertificateThemeContext.tsx    ← theme tokens as React context
│
├── shared/
│   ├── CertificateFrame.tsx           ← outermost container + context provider
│   ├── CertificateBorder.tsx          ← border layers + corner ornaments (position: absolute)
│   ├── CertificateHeader.tsx          ← church identity block
│   ├── CertificateRibbon.tsx          ← ornamental dividers (3 variants)
│   ├── CertificateName.tsx            ← child name — the focal point
│   ├── CertificateScripture.tsx       ← scripture medallion box
│   ├── CertificateBlessing.tsx        ← optional blessing (hidden when empty)
│   ├── CertificateFooter.tsx          ← 3-column footer orchestrator
│   └── CertificateSeal.tsx            ← center seal (placeholder / future image)
│
├── motifs/
│   ├── BirthdayMotif.tsx              ← balloon SVG, theme-aware
│   └── [future motifs per certificate type]
│
├── types/
│   └── certificate.types.ts           ← all shared TypeScript types and interfaces
│
├── BirthdayCertificate.tsx            ← flagship composition (master reference)
├── SpiritualBirthdayCertificate.tsx   ← inherits master layout
├── BaptismCertificate.tsx             ← inherits master layout
├── ScriptureMemoryCertificate.tsx     ← inherits master layout
├── PromotionCertificate.tsx           ← inherits master layout
├── ServantHeartCertificate.tsx        ← inherits master layout
│
└── CertificateRenderer.tsx            ← smart type-to-component selector

lib/certificates/
├── certData.ts                        ← CERT_TYPES, CERT_BLESSINGS (data only, no JSX)
├── themes.ts                          ← token computation: template → CertTheme object
└── printStyles.ts                     ← canonical @media print CSS (single source of truth)
```

---

## Theme System

The two templates are expressed as a typed token object computed once in `themes.ts` and distributed to all child components via `CertificateThemeContext`. No component ever branches on `isPurple` or `isIvory`. Each component calls `useCertificateTheme()` and reads the token it needs.

### Token Shape (`CertTheme`)

| Token | Purpose |
|---|---|
| `background` | Gradient string or solid hex |
| `boxShadow` | Outer glow / shadow |
| `outerBorder` | Outermost gold border |
| `midBorder` | Second border line at 6px inset |
| `innerBorder` | Inner frame at 13px inset |
| `cornerColor` | L-brackets and diamond accents |
| `titleColor` | Church name, certificate title, minister name |
| `nameColor` | Child name (white vs near-black) |
| `accentColor` | Scripture reference, footer church name |
| `dimColor` | Section labels ("Presented By", "Date of Presentation") |
| `dividerColor` | Thin rule lines |
| `ornamentColor` | ❖ ornament characters |
| `scriptureTextColor` | Verse body text |
| `medallionBackground` | Scripture box background tint |
| `medallionBorder` | Scripture box border |
| `blessingColor` | Personalized blessing text |
| `topAccentType` | `'cross-glow'` (Purple) or `'crown'` (Ivory) |

Adding a third template in the future requires adding one new token set to `themes.ts`. Zero changes to any component.

---

## Component Responsibilities

### `CertificateFrame`

Owns the outermost container: background, box shadow, overall dimensions, padding, `box-sizing`. Provides `CertificateThemeContext` to all children. Renders `<CertificateBorder />` as an absolutely-positioned child.

Does not own any content, typography, or data.

**Props:** `template: "purple" | "white"`, `children: ReactNode`

---

### `CertificateBorder`

Owns the three-layer border system (outer, mid at 6px inset, inner frame at 13px inset), all four L-bracket corner ornaments, and all four corner diamond accents. Completely non-interactive (`pointer-events: none`).

Does not own anything visible except decorative lines and points.

**Props:** none — reads from `useCertificateTheme()`

---

### `CertificateHeader`

Owns the entire church identity block:

- Top accent (glowing ✝ cross for Purple; 👑 crown for Ivory — driven by `topAccentType` token)
- Church logo area — rectangular placeholder (`border-radius: 3px`). No circles. No initials. No exceptions.
- Church name (uppercase serif)
- Church tagline (italic, hidden entirely when blank)

**Props:** `churchName`, `churchTagline?`, `logoUrl?`

---

### `CertificateRibbon`

Owns one ornamental divider element. Three variants:

| Variant | Visual |
|---|---|
| `"triple"` | `──── ❖ ❖ ❖ ────` with gradient fade lines |
| `"single"` | `──── ❖ ────` with gradient fade lines |
| `"diamond"` | `─── ◆ ───` compact, used below the certificate title |

Replaces 4–5 repeated inline div blocks with one reusable element.

**Props:** `variant: "triple" | "single" | "diamond"`

---

### `CertificateName`

Owns the child's name. 54px italic Georgia, weight 900. Centered. The single most important visual element on the certificate.

Falls back to the placeholder "Child's Name" internally when the prop is empty.

Must always be the largest text element on the certificate. No future change may reduce its size below any other typographic element.

**Props:** `name: string`

---

### `CertificateScripture`

Owns the scripture medallion — bordered box, verse text (italic, line-height 1.5), reference line with translation abbreviation appended.

The medallion has a max-width of approximately 440px. The scripture block must never be visually heavier than the child name block above it.

**Props:** `verse: string`, `reference: string`, `translation: "kjv" | "niv"`

---

### `CertificateBlessing`

Owns the optional personalized blessing. Renders nothing — including no divider above itself — when `blessing` is an empty string.

**Props:** `blessing: string`

---

### `CertificateSeal`

Owns the circular center element in the footer. Currently renders a ✝ cross. When `sealImageUrl` is provided (Phase 2), renders the church's uploaded seal image instead.

**Props:** `sealImageUrl?: string`, `size?: number`

---

### `CertificateFooter`

Owns the three-column bottom layout. Orchestrates `CertificateSeal` as the center column. Never renders blank signature lines.

| Column | Content |
|---|---|
| Left | "PRESENTED BY" label → minister name (italic Georgia 17px) → minister title → church name |
| Center | `<CertificateSeal />` |
| Right | "DATE OF PRESENTATION" label → formatted date |

**Props:** `ministerName`, `ministerTitle`, `churchName`, `date`, `sealImageUrl?`

---

### `BirthdayMotif`

Owns the balloon SVG cluster. Three balloons, theme-aware colors, shine highlights, curved strings. Has no knowledge of certificates — it is a standalone SVG component.

**Props:** `template: "purple" | "white"`, `size?: number`

---

## Certificate Type Compositions

Each certificate file assembles shared components into a complete certificate. It does not implement visual logic — it only orchestrates.

### Master Layout (established by `BirthdayCertificate.tsx`)

All future certificate types follow this exact vertical sequence:

```
<CertificateFrame>
  <CertificateBorder />                      ← absolute, non-flow

  <CertificateHeader ... />                  ← church identity

  <CertificateRibbon variant="triple" />     ← ❖ ❖ ❖

  [Certificate motif]                        ← type-specific artwork
  [Certificate title]                        ← type-specific title text
  [Certificate subtitle]                     ← type-specific subtitle text

  <CertificateRibbon variant="diamond" />    ← ─── ◆ ───

  <CertificateName name={childName} />       ← THE FOCAL POINT

  [thin rule]

  <CertificateScripture ... />               ← scripture medallion

  <CertificateBlessing blessing={blessing} /> ← hidden when empty

  <CertificateRibbon variant="single" />     ← ❖

  <CertificateFooter ... />                  ← 3-column footer
</CertificateFrame>
```

The certificate title, subtitle, and motif are local to each composition file. All other elements are shared components and must not be reimplemented.

---

## Visual Hierarchy Rule

The eye must move in this order and no other:

1. Church identity (logo, name, tagline)
2. Certificate title
3. Ribbon subtitle
4. **Child name** ← primary focal point
5. Scripture
6. Blessing
7. Footer

Nothing may compete with the child's name. No element above the child name may approach its typographic weight. No element below may exceed it.

---

## Church Branding Rules

| Rule | Requirement |
|---|---|
| ShepherdKids branding | Never appears on any certificate |
| Church logo shape | Rectangular only |
| Circular logo crop | Prohibited |
| Initials inside circles | Prohibited |
| Logo area aspect support | Must accommodate horizontal, square, wide, and tall logos |
| Platform URLs, names, icons | Prohibited |

---

## Ornamentation Rules

- Elegant and minimal
- Never cluttered
- No cartoon styling
- No clip art
- No childish graphics
- Ornaments serve the layout — they do not decorate it

---

## Birthday Certificate Motif Rules

- Use elegant balloon artwork only
- Do not use birthday cakes
- Do not use presents
- Do not use candles
- Balloons must feel celebratory but sophisticated
- Balloon palette is theme-aware (purple/gold for Royal Purple; deep violet/gold/bronze for Classic Ivory)

---

## Scripture Rules

- Every certificate type supports both KJV and NIV
- No certificate type ships with only one translation
- The translation abbreviation is always appended to the reference: `— Psalm 139:13–14 KJV`
- Default translation: KJV
- Scripture is displayed inside a decorative medallion box
- The medallion must never visually outweigh the child name

---

## Blessing Rules

- Five states: None, Traditional, Encouragement, Future Calling, Custom
- None clears the textarea and hides the blessing on the certificate
- Selecting a preset populates the textarea (user may still edit)
- Editing the textarea switches the selector to Custom
- Switching certificate type resets the selector to None
- The blessing is hidden entirely (including its divider) when the text is empty

---

## Footer Rules

- Three-column layout: Presented By | Seal | Date
- No blank signature lines — ever
- Minister name rendered in italic Georgia (script-style display)
- Church seal centered
- Minister title and church name appear below the minister name
- Columns use `flex: 1` with `flexShrink: 0` on the seal

---

## Print Rules

| Setting | Value |
|---|---|
| Trigger | `window.print()` via "Print Certificate" button |
| Print area | `#certificate-print-area` only |
| All other UI | Hidden via `visibility: hidden` |
| Page size | Landscape (`@page { size: landscape; }`) |
| Margin | 0.4in |
| Color fidelity | `print-color-adjust: exact` — both templates force full color |
| Max certificate width | 9.5in |

Print CSS lives exclusively in `lib/certificates/printStyles.ts`. No component defines its own print styles.

---

## Data Layer

All certificate content data (`CERT_TYPES`, `CERT_BLESSINGS`, scripture text, references) lives in `lib/certificates/certData.ts`. This file contains no JSX and no styles. It is pure TypeScript data. Components do not import it directly — `CertificateRenderer` resolves content from it and passes it as props.

---

## `CertificateRenderer`

The public API for the certificate engine. Receives `certType` and all data props. Resolves scripture for the given type and translation from `certData.ts`. Returns the appropriate certificate composition.

This is the **only** place in the system that branches on `certType`. No shared component ever does.

---

## Migration Plan

The existing `page.tsx` form shell changes minimally:

| Change | Detail |
|---|---|
| Remove | `CertPreview`, `ChurchLogoMark`, `MinistrySeal`, `BirthdayMotif` inline functions |
| Move | `CERT_TYPES`, `CERT_BLESSINGS` → `lib/certificates/certData.ts` |
| Move | `PRINT_STYLES` → `lib/certificates/printStyles.ts` |
| Replace | `<CertPreview ...>` → `<CertificateRenderer ...>` |
| Keep | All form state, URL params, blessing selector logic unchanged |

---

## Visual Approval Gate

No certificate implementation is considered complete until visual review has been approved.

Passing TypeScript compilation, passing builds, and successful rendering do not constitute completion.

**Visual quality is the final acceptance criterion.**

### Approval Checklist

- Church branding is elegant and dominant.
- Child's name is immediately the focal point.
- Typography hierarchy is balanced.
- Borders feel premium and symmetrical.
- Ornamentation enhances rather than distracts.
- Scripture box supports the design instead of dominating it.
- Footer is visually balanced.
- White space feels intentional.
- Certificate looks frame-worthy.
- Certificate looks professional when printed.
- Purple and Ivory templates feel like the same family.
- Overall design communicates honor and spiritual significance.

If any item fails, the certificate returns to design refinement before approval.

### Design Iteration Rule

1. Build component.
2. Generate screenshot.
3. Review visually.
4. Refine spacing, typography, and hierarchy.
5. Generate new screenshot.
6. Repeat until approved.

### Master Lock Rule

Once the Birthday Certificate is approved, it becomes the locked master reference implementation.

Future certificates **may change only:**
- Title
- Subtitle
- Scripture
- Motif
- Blessing presets
- Certificate-specific artwork

Future certificates **may not change:**
- Layout
- Spacing
- Typography hierarchy
- Border system
- Footer structure
- Church branding placement
- Child name placement
- Scripture placement
- Print behavior

---

## Build Order

| Step | Milestone | Status |
|---|---|---|
| 1 | Architecture and framework documentation | ✅ Complete |
| 2.1 | `CertificateThemeContext.tsx` | Pending |
| 2.2 | `themes.ts` | Pending |
| 2.3 | `CertificateFrame.tsx` | Pending |
| 2.4 | `CertificateBorder.tsx` | Pending |
| 2.5 | `CertificateHeader.tsx` | Pending |
| 2.6 | `CertificateRibbon.tsx` | Pending |
| 2.7 | `CertificateName.tsx` | Pending |
| 2.8 | `CertificateScripture.tsx` | Pending |
| 2.9 | `CertificateBlessing.tsx` | Pending |
| 2.10 | `CertificateFooter.tsx` + `CertificateSeal.tsx` | Pending |
| 2.11 | `BirthdayMotif.tsx` | Pending |
| 2.12 | `BirthdayCertificate.tsx` | Pending |
| 2.13 | `CertificateRenderer.tsx` | Pending |
| 2.14 | Replace `CertPreview` in `page.tsx` with `CertificateRenderer` | Pending |
| 2.15 | Screenshot review and refinement | Pending |
| 3 | Visual approval — Birthday Certificate locked as master | Pending |
| 4 | Build remaining certificate types using locked master | Pending |

**No certificate type beyond Birthday ships until Birthday passes the Visual Approval Gate.**

---

## Future Extensibility

| Future capability | What it requires |
|---|---|
| Church logo upload | `CertificateHeader` already accepts `logoUrl?` |
| Church seal image | `CertificateSeal` already accepts `sealImageUrl?` |
| New certificate type | New motif (optional) + new composition file + one case in `CertificateRenderer` |
| Third template | New token set in `themes.ts`. Zero component changes. |
| PDF generation | `CertificateRenderer` is already a self-contained React tree. Wrap with a server-side renderer. |
| Spanish / Chinese | New scripture strings in `certData.ts`. Components are language-agnostic. |
| Custom scripture per church | Override in `certData.ts` lookup. No component changes. |
| Signature image upload | `CertificateFooter` accepts optional `signatureImageUrl?`. Replaces italic name rendering. |
