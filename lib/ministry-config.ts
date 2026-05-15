export type MinistryConfig = {
  // Kept for backward compat with existing pages (cfg.name, cfg.stages, cfg.hasShepherdGroups)
  name: string;
  emoji: string;
  stages: string[];
  hasShepherdGroups: boolean;

  // New canonical fields
  label: string;
  ageRange?: string;
  grades?: string[];
  pipelineStages: string[];
  hasTeamChallenge: boolean;
  hasGrowthModule: boolean;
  invitationOnly: boolean;
  hasMetamorphosis: boolean;
  stageDescriptions?: Record<string, string>;
  metamorphosisRole?: 'sending' | 'receiving';
  metamorphosisMentorGrades?: string[];
  volunteerGrades?: string[];
  autoPopulateGender?: 'male' | 'female';
  autoPopulateMinAge?: number;
  metamorphosisMentorEligible?: boolean;
};

export const MINISTRY_CONFIG: Record<string, MinistryConfig> = {
  childrens: {
    name: "Children's Ministry",          // compat
    label: "Children's Ministry",
    emoji: "🧒",
    ageRange: "3rd–6th Grade",
    grades: ["3rd", "4th", "5th", "6th"],
    pipelineStages: ["Visitor", "Regular", "Engaged", "Memory Verse", "Faith Decision", "Baptism Ready"],
    stages: ["Visitor", "Regular", "Engaged", "Memory Verse", "Faith Decision", "Baptism Ready"], // compat
    hasShepherdGroups: true,              // compat
    hasTeamChallenge: true,
    hasGrowthModule: false,
    invitationOnly: false,
    hasMetamorphosis: true,
    metamorphosisRole: 'sending',
    volunteerGrades: [],
    stageDescriptions: {
      "Visitor": "First time guest",
      "Regular": "4+ visits",
      "Engaged": "Consistent & active participant",
      "Memory Verse": "Achieved memory verse challenge",
      "Faith Decision": "Made a decision for Christ",
      "Baptism Ready": "Ready for baptism",
    },
  },
  "middle-school": {
    name: "Middle School",                // compat
    label: "Middle School",
    emoji: "🎒",
    ageRange: "7th–8th Grade",
    grades: ["7th", "8th"],
    pipelineStages: ["Visitor", "Regular", "Team Member", "Co-Captain", "Captain", "Faith Decision"],
    stages: ["Visitor", "Regular", "Team Member", "Co-Captain", "Captain", "Faith Decision"], // compat
    hasShepherdGroups: true,              // compat
    hasTeamChallenge: true,
    hasGrowthModule: false,
    invitationOnly: false,
    hasMetamorphosis: true,
    metamorphosisRole: 'receiving',
    volunteerGrades: [],
  },
  "high-school": {
    name: "High School",                  // compat
    label: "High School",
    emoji: "🎓",
    ageRange: "9th–12th Grade",
    grades: ["9th", "10th", "11th", "12th"],
    pipelineStages: ["Visitor", "Regular", "Small Group", "Leadership Track", "Serving", "Mentoring"],
    stages: ["Visitor", "Regular", "Small Group", "Leadership Track", "Serving", "Mentoring"], // compat
    hasShepherdGroups: true,              // compat
    hasTeamChallenge: true,
    hasGrowthModule: false,
    invitationOnly: false,
    hasMetamorphosis: true,
    metamorphosisRole: 'receiving',
    metamorphosisMentorGrades: ["11th", "12th"],
    volunteerGrades: ["11th", "12th"],
  },
  "young-adults": {
    name: "Young Adults",                 // compat
    label: "Young Adults",
    emoji: "🎉",
    ageRange: "Ages 18–30",
    pipelineStages: ["Visitor", "Regular", "Connected", "Serving", "Leading", "Discipling"],
    stages: ["Visitor", "Regular", "Connected", "Serving", "Leading", "Discipling"], // compat
    hasShepherdGroups: false,             // compat
    hasTeamChallenge: false,
    hasGrowthModule: true,
    invitationOnly: false,
    hasMetamorphosis: false,
    metamorphosisMentorEligible: true,
  },
  mens: {
    name: "Men's Ministry",               // compat
    label: "Men's Ministry",
    emoji: "👔",
    pipelineStages: ["Visitor", "Regular", "Accountability Group", "Serving", "Mentoring", "Leading"],
    stages: ["Visitor", "Regular", "Accountability Group", "Serving", "Mentoring", "Leading"], // compat
    hasShepherdGroups: false,             // compat
    hasTeamChallenge: false,
    hasGrowthModule: true,
    invitationOnly: false,
    hasMetamorphosis: false,
    autoPopulateGender: 'male',
  },
  womens: {
    name: "Women's Ministry",             // compat
    label: "Women's Ministry",
    emoji: "👗",
    pipelineStages: ["Visitor", "Regular", "Bible Study", "Serving", "Mentoring", "Leading"],
    stages: ["Visitor", "Regular", "Bible Study", "Serving", "Mentoring", "Leading"], // compat
    hasShepherdGroups: false,             // compat
    hasTeamChallenge: false,
    hasGrowthModule: true,
    invitationOnly: false,
    hasMetamorphosis: false,
    autoPopulateGender: 'female',
  },
  seniors: {
    name: "Senior Ministry",              // compat
    label: "Senior Ministry",
    emoji: "🌟",
    ageRange: "Ages 55+",
    pipelineStages: ["Visitor", "Regular", "Connected", "Mentor", "Legacy"],
    stages: ["Visitor", "Regular", "Connected", "Mentor", "Legacy"], // compat
    hasShepherdGroups: false,             // compat
    hasTeamChallenge: false,
    hasGrowthModule: true,
    invitationOnly: false,
    hasMetamorphosis: false,
    autoPopulateMinAge: 55,
  },
  ushers: {
    name: "Ushers Ministry",             // compat
    label: "Ushers Ministry",
    emoji: "🎩",
    pipelineStages: ["New", "Training", "Active", "Senior Usher", "Head Usher"],
    stages: ["New", "Training", "Active", "Senior Usher", "Head Usher"], // compat
    hasShepherdGroups: false,             // compat
    hasTeamChallenge: false,
    hasGrowthModule: false,
    invitationOnly: true,
    hasMetamorphosis: false,
  },
  drama: {
    name: "Drama & Skit Ministry",        // compat
    label: "Drama & Skit Ministry",
    emoji: "🎭",
    pipelineStages: ["New", "Ensemble", "Featured", "Lead", "Director Track"],
    stages: ["New", "Ensemble", "Featured", "Lead", "Director Track"], // compat
    hasShepherdGroups: false,             // compat
    hasTeamChallenge: false,
    hasGrowthModule: false,
    invitationOnly: true,
    hasMetamorphosis: false,
  },
  "senior-high": {
    name: "Senior High",
    label: "Senior High",
    emoji: "🎓",
    ageRange: "9th–12th Grade",
    grades: ["9th", "10th", "11th", "12th"],
    pipelineStages: ["visitor", "regular", "engaged", "leadership_role", "faith_decision", "baptism_ready"],
    stages: ["visitor", "regular", "engaged", "leadership_role", "faith_decision", "baptism_ready"],
    hasShepherdGroups: true,
    hasTeamChallenge: false,
    hasGrowthModule: false,
    invitationOnly: false,
    hasMetamorphosis: false,
    stageDescriptions: {
      "visitor": "First time guest",
      "regular": "4+ visits",
      "engaged": "Consistent & active participant",
      "leadership_role": "Serving or leading others",
      "faith_decision": "Made a decision for Christ",
      "baptism_ready": "Ready for baptism",
    },
  },
};

// ── Helper functions ──────────────────────────────────────────────────────────

export function hasTeamChallenge(type: string): boolean {
  return MINISTRY_CONFIG[type]?.hasTeamChallenge ?? false;
}

export function hasGrowthModule(type: string): boolean {
  return MINISTRY_CONFIG[type]?.hasGrowthModule ?? false;
}

export function isInvitationOnly(type: string): boolean {
  return MINISTRY_CONFIG[type]?.invitationOnly ?? false;
}

export function hasMetamorphosis(type: string): boolean {
  return MINISTRY_CONFIG[type]?.hasMetamorphosis ?? false;
}

export function getMetamorphosisMentorGrades(type: string): string[] {
  return MINISTRY_CONFIG[type]?.metamorphosisMentorGrades ?? [];
}

// ── Styling ───────────────────────────────────────────────────────────────────

export const STAGE_COLORS = [
  "#9ca3af", // 0 — gray
  "#3b82f6", // 1 — blue
  "#14b8a6", // 2 — teal
  "#f59e0b", // 3 — amber
  "#F28C28", // 4 — orange
  "#22c55e", // 5 — green
];

export function stageColor(stages: string[], stage: string | null): string {
  if (!stage) return STAGE_COLORS[0];
  const idx = stages.indexOf(stage);
  return STAGE_COLORS[Math.min(idx < 0 ? 0 : idx, STAGE_COLORS.length - 1)];
}

// ── Age / gender utilities ────────────────────────────────────────────────────

export function ageFrom(birthdate: string | null | undefined): number | null {
  if (!birthdate) return null;
  const birth = new Date(birthdate + 'T00:00:00');
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
}

export function getAutoMinistries(member: {
  gender?: string | null;
  birthdate?: string | null;
  member_type?: string | null;
}): string[] {
  const age = ageFrom(member.birthdate);
  const types: string[] = [];

  if (age !== null) {
    if (age >= 8 && age < 12)  types.push('childrens');
    if (age >= 12 && age < 14) types.push('middle-school');
    if (age >= 14 && age < 18) types.push('high-school');
    if (age >= 18 && age < 30) types.push('young-adults');
    if (age >= 55)             types.push('seniors');
    // Gender-based only for adults not already in an age-specific ministry
    if (age >= 18) {
      if (member.gender === 'male')   types.push('mens');
      if (member.gender === 'female') types.push('womens');
    }
  } else {
    // No birthdate — use gender / member_type only
    if (member.gender === 'male')   types.push('mens');
    if (member.gender === 'female') types.push('womens');
  }

  // member_type=child fallback
  if (types.length === 0 && member.member_type === 'child') types.push('childrens');

  return types;
}

// ── Navigation ────────────────────────────────────────────────────────────────

export const MINISTRY_NAV_ITEMS = [
  { label: "🧒 Children's Ministry", href: "/dashboard/ministry/childrens" },
  { label: "🎒 Middle School",        href: "/dashboard/ministry/middle-school" },
  { label: "🎓 High School",          href: "/dashboard/ministry/high-school" },
  { label: "🎉 Young Adults",         href: "/dashboard/ministry/young-adults" },
  { label: "👔 Men's Ministry",       href: "/dashboard/ministry/mens" },
  { label: "👗 Women's Ministry",     href: "/dashboard/ministry/womens" },
  { label: "🌟 Senior Ministry",      href: "/dashboard/ministry/seniors" },
  { label: "🎩 Ushers Ministry",      href: "/dashboard/ministry/ushers" },
  { label: "🎭 Drama & Skit",         href: "/dashboard/ministry/drama" },
  { label: "🏠 Bible Study Pods",     href: "/dashboard/bible-study-pods" },
  { label: "🎓 Senior High",            href: "/dashboard/ministry/senior-high" },
];
