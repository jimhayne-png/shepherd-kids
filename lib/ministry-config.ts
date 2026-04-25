export type MinistryConfig = {
  name: string;
  emoji: string;
  stages: string[];
  hasShepherdGroups: boolean;
};

export const MINISTRY_CONFIG: Record<string, MinistryConfig> = {
  childrens: {
    name: "Children's Ministry",
    emoji: "🧒",
    stages: ["Visitor", "Regular", "Engaged", "Memory Verse", "Faith Decision", "Baptism Ready"],
    hasShepherdGroups: true,
  },
  preteen: {
    name: "Pre-Teen Ministry",
    emoji: "👦",
    stages: ["Visitor", "Regular", "Engaged", "Captain Track", "Faith Decision", "Baptism Ready"],
    hasShepherdGroups: true,
  },
  "middle-school": {
    name: "Middle School",
    emoji: "🎒",
    stages: ["Visitor", "Regular", "Team Member", "Co-Captain", "Captain", "Faith Decision"],
    hasShepherdGroups: true,
  },
  youth: {
    name: "Youth Group",
    emoji: "🎓",
    stages: ["Visitor", "Regular", "Small Group", "Leadership Track", "Serving", "Mentoring"],
    hasShepherdGroups: true,
  },
  "young-adults": {
    name: "Young Adults",
    emoji: "🎉",
    stages: ["Visitor", "Regular", "Connected", "Serving", "Leading", "Discipling"],
    hasShepherdGroups: false,
  },
  mens: {
    name: "Men's Ministry",
    emoji: "👔",
    stages: ["Visitor", "Regular", "Accountability Group", "Serving", "Mentoring", "Leading"],
    hasShepherdGroups: false,
  },
  womens: {
    name: "Women's Ministry",
    emoji: "👗",
    stages: ["Visitor", "Regular", "Bible Study", "Serving", "Mentoring", "Leading"],
    hasShepherdGroups: false,
  },
  seniors: {
    name: "Senior Ministry",
    emoji: "🌟",
    stages: ["Visitor", "Regular", "Connected", "Mentor", "Legacy"],
    hasShepherdGroups: false,
  },
  drama: {
    name: "Drama & Skit Ministry",
    emoji: "🎭",
    stages: ["Visitor", "Regular", "Ensemble", "Featured", "Lead", "Director Track"],
    hasShepherdGroups: false,
  },
};

export const STAGE_COLORS = [
  "#9ca3af", // 0 Visitor — gray
  "#3b82f6", // 1 Regular — blue
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
    if (age >= 8 && age < 11) types.push('childrens');
    if (age >= 11 && age < 12) types.push('preteen');
    if (age >= 12 && age < 14) types.push('middle-school');
    if (age >= 14 && age < 18) types.push('youth');
    if (age >= 18 && age < 30) types.push('young-adults');
    if (age >= 55) types.push('seniors');
    // Gender-based only for adults not already in an age-specific ministry
    if (age >= 18) {
      if (member.gender === 'male') types.push('mens');
      if (member.gender === 'female') types.push('womens');
    }
  } else {
    // No birthdate — use gender and member_type only
    if (member.gender === 'male') types.push('mens');
    if (member.gender === 'female') types.push('womens');
  }

  // member_type=child fallback if no age match
  if (types.length === 0 && member.member_type === 'child') types.push('childrens');

  return types;
}

export const MINISTRY_NAV_ITEMS = [
  { label: "🧒 Children's Ministry", href: "/dashboard/ministry/childrens" },
  { label: "👦 Pre-Teen", href: "/dashboard/ministry/preteen" },
  { label: "🎒 Middle School", href: "/dashboard/ministry/middle-school" },
  { label: "🎓 Youth Group", href: "/dashboard/ministry/youth" },
  { label: "🎉 Young Adults", href: "/dashboard/ministry/young-adults" },
  { label: "👔 Men's Ministry", href: "/dashboard/ministry/mens" },
  { label: "👗 Women's Ministry", href: "/dashboard/ministry/womens" },
  { label: "🌟 Senior Ministry", href: "/dashboard/ministry/seniors" },
  { label: "🎭 Drama & Skit", href: "/dashboard/ministry/drama" },
];
