# Certificate Engine Specification

**Version:** 1.0  
**Status:** Active — Source of Truth  
**Applies to:** `app/dashboard/children-ministry/certificates/`

This document governs all certificate design, content, copy, and technical decisions. Any change to a certificate template, content rule, or translation behavior must be reflected here first.

---

## 1. Core Principle

Every certificate produced by the Certificate Engine must represent **the church**, not the software platform.

- The church's identity (logo, name, tagline) is the primary visual element
- ShepherdKids branding must never appear on any certificate
- Certificates must remain meaningful keepsakes for decades — no technology-dependent elements

---

## 2. Master Templates

Exactly **two** master templates are supported. No new templates may be added without updating this specification.

### 2.1 Royal Purple Premium

A premium dark certificate designed for framing. Metallic gold on deep royal purple.

| Element | Value |
|---------|-------|
| Background | Deep royal purple gradient: `#1A083E → #32177A → #220F55` |
| Outer border | 3px solid metallic gold (`#D4AF37`) |
| Inner frame | 1px solid `rgba(212,175,55,0.24)`, inset 12px, radius 2px |
| Corner ornaments | 22×22px gold bracket cuts, 18px from edges, 2px weight |
| Church name | Metallic gold (`#D4AF37`), uppercase, Georgia serif |
| Child name | Pure white (`#FFFFFF`), Georgia serif — largest text |
| Certificate title | Metallic gold, Georgia serif |
| Scripture verse | White at 72% opacity, italic |
| Scripture reference | Metallic gold |
| Ornamental dividers | `❖ ❖ ❖` / `❖` in gold at 58–60% opacity |
| Presenter/date labels | White at 40% opacity, uppercase |
| Minister name | Metallic gold, Georgia serif, italic — script-style display |
| Box shadow | `0 8px 56px rgba(26,8,62,0.65)` |

### 2.2 Classic Ivory Premium

A timeless light certificate suitable for any occasion. Aged gold on warm ivory parchment.

| Element | Value |
|---------|-------|
| Background | Warm ivory parchment: `#FDFAEF` |
| Top accent | Royal crown (👑) above church mark |
| Outer border | 2.5px solid aged gold (`#8B6914`) |
| Inner frame | 1px solid `rgba(175,135,40,0.35)`, inset 12px, radius 2px |
| Corner ornaments | 22×22px aged gold bracket cuts, 18px from edges, 2px weight |
| Church name | Deep near-black (`#1C0A2E`), uppercase, Georgia serif |
| Child name | Deep near-black (`#1C0A2E`), Georgia serif — largest text |
| Certificate title | Deep near-black (`#1C0A2E`), Georgia serif |
| Scripture verse | Dark brown (`#4A3728`), italic |
| Scripture reference | Aged gold (`#8B6914`) |
| Ornamental dividers | `❖ ❖ ❖` / `❖` in aged gold (`#B8860B`) |
| Presenter/date labels | Medium brown (`#8B7355`), uppercase |
| Minister name | Deep near-black, Georgia serif, italic — script-style display |
| Box shadow | `0 4px 28px rgba(0,0,0,0.09)` |

### 2.3 Template Code Values

| Code | Display name |
|------|-------------|
| `"purple"` | Royal Purple Premium |
| `"white"` | Classic Ivory Premium |

The internal code value `"white"` is preserved for URL param compatibility. The user-facing display name is always "Classic Ivory Premium."

---

## 3. Branding Rules

### Prohibited on all certificates
- ShepherdKids logo
- ShepherdKids wordmark or name
- Any software platform name, icon, or URL
- QR codes
- Technology-dependent elements of any kind

### Required church identity (top of certificate)
1. Church logo (rectangular area — see Section 4)
2. Church name
3. Church tagline *(optional — hidden when blank)*

The certificate must be indistinguishable from one a church produced independently.

---

## 4. Church Logo System

### 4.1 Logo Area Requirements
- The church logo area must be **rectangular**
- Logo images must **never** be circular-cropped
- Logo images must **never** be oval-cropped or masked into any non-rectangular shape
- The logo's aspect ratio must always be preserved — no stretching or squashing
- Transparent PNG and SVG formats must be supported when implemented

### 4.2 Current Placeholder (temporary)
Until church logo upload is implemented, a circular initials mark (`ChurchLogoMark` component) is used as a stand-in. This placeholder:
- Is acknowledged as a temporary deviation from the rectangular logo rule
- Must be replaced entirely when logo upload is built — not adapted
- Uses initials derived from the first two words of the church name

### 4.3 Logo Placement and Sizing

| Location | Placeholder size | Future max-width |
|----------|-----------------|-----------------|
| Top of certificate (Purple) | 58px diameter | 160px wide |
| Top of certificate (Ivory) | 52px diameter | 140px wide |
| Bottom center seal | 40px diameter | 60px wide |

---

## 5. Typography System

| Element | Font | Size | Weight | Style | Notes |
|---------|------|------|--------|-------|-------|
| Church name | Georgia, serif | 13px | 700 | Uppercase + letter-spaced | |
| Church tagline | System sans-serif | 10px | 400 | Italic | Hidden if blank |
| Certificate icon | Emoji | 34px | — | — | |
| Certificate title | Georgia, serif | 21px | 700 | Normal | No "Certificate of" prefix |
| **Child name** | Georgia, serif | **42px** | **900** | Normal | **Always the largest text element** |
| Scripture verse | System sans-serif | 12px | 400 | Italic | |
| Scripture reference | System sans-serif | 11px | 600 | Normal | Always includes translation (KJV / NIV) |
| Personalized blessing | System sans-serif | 11px | 400 | Italic | Hidden when blank |
| Minister name | Georgia, serif | 17px | 400 | **Italic** | Script-style; no signature line |
| Minister title | System sans-serif | 9px | 400 | Normal | |
| Church name (footer) | System sans-serif | 9px | 600 | Normal | |
| Section labels | System sans-serif | 8px | 700 | Uppercase + letter-spaced | |
| Date of presentation | Georgia, serif | 15px | 700 | Normal | |

**The child's name is always the visual focal point of the certificate.**

---

## 6. Certificate Layout

### Top section (centered)
```
[Crown — Ivory template only]
[Church Logo / Placeholder]
CHURCH NAME
Church Tagline (if present)
──── ❖ ❖ ❖ ────
[Certificate Type Icon]
Certificate Title
──── (thin rule) ────
Child's Name
──── (thin rule) ────
"Scripture verse"
— Reference KJV/NIV
[Personalized Blessing — if present]
──── ❖ ────
```

### Bottom section (three columns)
```
Left                    Center          Right
──────────────────      ──────────      ──────────────────
Presented By            [Logo Seal]     Date of Presentation
[Minister Name — italic]                [Formatted Date]
[Minister Title]
[Church Name]
```

---

## 7. Certificate Content Rules

### Required fields
| Field | Behavior |
|-------|----------|
| Child name | Always shown; placeholder "Child's Name" when blank |
| Certificate type | Determines title, icon, and default scripture |
| Church name | Always shown; placeholder "Your Church Name" when blank |
| Minister name | Always shown script-style; placeholder "Minister's Name" when blank |
| Date of presentation | Always shown; `—` when blank |

### Optional fields
| Field | Behavior when empty |
|-------|-------------------|
| Church tagline | Section hidden entirely |
| Personalized blessing | Section and its divider hidden entirely |

### Strictly prohibited
| Element | Reason |
|---------|--------|
| QR codes | Certificates must remain timeless; URLs rot |
| "Presented before the church family" | Implied by the document itself; adds clutter |
| Blank signature lines | School-style; not premium; replaced by script-style minister name |
| "This Certificate is Presented to" | Implied; removed for cleaner design |
| "Certificate of" title prefix | Redundant; the document is self-evidently a certificate |
| Software branding of any kind | Certificate belongs to the church |

---

## 8. Scripture and Translation Engine

### 8.1 Core Rules
- Every certificate type that displays scripture must support **both KJV and NIV**
- No certificate type may ship with only one translation
- The translation selector is a **single global toggle** (KJV | NIV) that applies to whichever certificate is currently being created
- **Default translation: KJV**

### 8.2 Reference Format
The translation abbreviation is always appended to the scripture reference. Never omit it.

```
— Romans 8:31 KJV
— Romans 8:31 NIV
```

### 8.3 Scripture Index

All verses below are the default assignments. Future church settings will allow custom override per type.

| Certificate Type | Reference | KJV | NIV |
|----------------|-----------|-----|-----|
| Birthday Celebration | Numbers 6:24–25 | "The Lord bless thee, and keep thee: the Lord make his face shine upon thee." | "The Lord bless you and keep you; the Lord make his face shine on you." |
| Spiritual Birthday | Romans 8:31 | "If God be for us, who can be against us?" | "If God is for us, who can be against us?" |
| Baptism Celebration | 2 Corinthians 5:17 | "Therefore if any man be in Christ, he is a new creature: old things are passed away; all things are become new." | "Therefore, if anyone is in Christ, the new creation has come: the old has gone, the new is here!" |
| Faith Milestone | Philippians 4:13 | "I can do all things through Christ which strengtheneth me." | "I can do all this through him who gives me strength." |
| Scripture Memory Award | Psalm 119:105 | "Thy word is a lamp unto my feet, and a light unto my path." | "Your word is a lamp for my feet, a light on my path." |
| Promotion Sunday | Jeremiah 29:11 | "For I know the thoughts that I think toward you, saith the Lord, thoughts of peace, and not of evil." | "For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you." |
| Servant Heart Award | Galatians 5:13 | "By love serve one another." | "Serve one another humbly in love." |
| Kindness Award | Ephesians 4:32 | "And be ye kind one to another, tenderhearted, forgiving one another." | "Be kind and compassionate to one another, forgiving each other." |
| Helper Award | Colossians 3:23 | "Whatsoever ye do, do it heartily, as to the Lord, and not unto men." | "Whatever you do, work at it with all your heart, as working for the Lord." |
| Attendance Award | Hebrews 10:25 | "Not forsaking the assembling of ourselves together, as the manner of some is." | "Not giving up meeting together, as some are in the habit of doing." |

### 8.4 Future Translation Settings

**Church-wide default (planned)**  
A church admin setting will allow the church to set KJV or NIV as their organization-wide default. This default pre-fills the toggle when the Certificate Creator is opened.

**Stored per issued certificate (planned)**  
When certificate issuance is persisted to the database, the translation used at time of issue must be stored on the certificate record and must not change retroactively.

**Additional language support (future)**  
See Section 11 — Roadmap. Spanish and Chinese (Simplified) are planned future translations, each requiring a separate selector layer above KJV/NIV.

---

## 9. Personalized Blessing

- Free-text field, optional
- Recommended length: 2–3 sentences
- Displayed: italic, reduced opacity, centered, max-width ~430px
- When empty: the blessing text and the horizontal divider above it are both hidden
- Position: between the scripture reference and the bottom ornamental divider
- No label or heading is shown above the blessing on the printed certificate

---

## 10. Minister Signature

Certificates use **script-style display** instead of a blank signature line.

### What this means
- The minister name is rendered in Georgia serif, italic, ~17px — giving a script-like appearance
- No underline, no blank line, no "X _______________" construct
- Below the minister name: Minister Title (9px), Church Name (9px bold)

### Why no signature line
Blank signature lines are associated with school certificates and formal bureaucratic documents. A premium keepsake should feel handcrafted. The script-style italic name achieves a personal, signed feel without a blank line that must be filled by hand.

### Future enhancement
A transparent PNG signature image upload will be supported. When implemented:
- The signature image replaces the italic text name
- The image is rendered at approximately 120×40px
- Minister title and church name remain below

---

## 11. Print Rules

### Browser print (current implementation)

| Setting | Value |
|---------|-------|
| Trigger | `window.print()` via "Print Certificate" button |
| Print area | `#certificate-print-area` only |
| All other UI | Hidden via `visibility: hidden` |
| Page size | Landscape (`@page { size: landscape; }`) |
| Margin | 0.4in |
| Color fidelity | `print-color-adjust: exact` — both templates force-print full color |
| Max certificate width | 9.5in |
| User instruction shown | "Use landscape orientation and disable headers/footers for best results." |

### Print CSS (canonical)

```css
@media print {
  @page { size: landscape; margin: 0.4in; }
  body * { visibility: hidden; }
  #certificate-print-area, #certificate-print-area * { visibility: visible; }
  #certificate-print-area {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #certificate-print-area > div {
    width: 100%;
    max-width: 9.5in;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
```

### Royal Purple Premium print behavior
Colors force-print. The purple gradient background and metallic gold print at full fidelity on color printers. On black-and-white printers the purple background prints as dark grey, which remains legible.

### Classic Ivory Premium print behavior
White/ivory background with dark text. Prints cleanly on all printers, including black-and-white. The aged gold accents print as medium grey on monochrome printers.

---

## 12. Future Roadmap

### Phase 2 — Church Identity
- [ ] Church logo upload (rectangular PNG/SVG, transparent background)
- [ ] Church seal design (separate optional SVG, appears in bottom center)
- [ ] Church-wide default Bible translation setting (KJV or NIV)

### Phase 3 — Issuance and Records
- [ ] Certificate issuance saved to database (child profile, date, type, translation, blessing text, template)
- [ ] Translation stored immutably on issued certificate record
- [ ] "Certificates issued" count on child profile Celebrations section
- [ ] Certificate history view per child and per church

### Phase 4 — Output
- [ ] PDF generation (server-side, downloadable, same visual as print output)
- [ ] Signature image upload (transparent PNG replaces script-style text)
- [ ] Certificate preview sharing link (parent-facing read-only view)

### Phase 5 — Customization
- [ ] Custom scripture override per certificate type per church
- [ ] Custom personalized blessing templates saved per church
- [ ] Additional certificate types beyond the current ten

### Phase 6 — Language
- [ ] Spanish language support (all certificate text fields + scripture)
- [ ] Chinese Simplified language support (all certificate text fields + scripture)
- [ ] Language selector appears alongside KJV/NIV selector when non-English is active

---

## 13. Certificate Creator UI — Form Sections

The Certificate Creator form panel is organized into these sections in order:

| Section | Fields |
|---------|--------|
| Child & Certificate | Child Name, Certificate Type |
| Church Identity | Church Name, Church Tagline |
| Presenter | Minister Name, Minister Title |
| Certificate Content | Date of Presentation, Bible Translation (KJV / NIV), Personalized Blessing |
| Template | Royal Purple Premium / Classic Ivory Premium toggle |
| Certificate Settings | Coming soon — logo upload, custom scripture, signature image, etc. |

---

## 14. Constraints Summary

| Rule | Value |
|------|-------|
| Master templates | 2 — Royal Purple Premium, Classic Ivory Premium |
| ShepherdKids branding on certificate | Never |
| Church logo shape | Rectangular only (placeholder is circular — temporary) |
| Child name size | Always largest text on the certificate |
| QR codes | Never |
| Blank signature lines | Never |
| Presentation statement | Never |
| "Certificate of" prefix | Never |
| Translations supported | KJV and NIV (both required per cert type) |
| Default translation | KJV |
| Print format | Landscape, browser print, `print-color-adjust: exact` |
| PDF | Not yet — planned Phase 4 |
| Spanish / Chinese | Not yet — planned Phase 6 |
