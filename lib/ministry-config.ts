export type MinistryConfig = {
  name: string;
  emoji: string;
  stages: string[];
  hasShepherdGroups: boolean;

  label: string;
  ageRange?: string;
  grades?: string[];
  pipelineStages: string[];
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

export const CHILDREN_PIPELINE_STAGES = [
  "Visitor",
  "Regular",
  "Engaged",
  "Growing in Faith",
  "Faith Decision",
  "Baptism",
  "Discipleship Step",
  "Leadership",
];

export const YOUNG_ADULTS_PIPELINE_STAGES = [
  "Visitor",
  "Regular",
  "Faith Decision",
  "Baptism",
  "Membership",
  "Serving",
  "Leading",
  "Discipleship",
];

// Shared descriptions for Men's, Women's, and Senior Adults — same stages, adult-focused language
export const ADULT_MINISTRY_STAGE_DESCRIPTIONS: Record<string, string> = {
  "Visitor": "First-time guest or new attendee exploring the ministry.",
  "Regular": "Attending consistently and building meaningful relationships within the ministry.",
  "Faith Decision": "Has made a personal decision to trust Christ or recommit their life to Him.",
  "Baptism": "Has publicly professed their faith through believer's baptism.",
  "Membership": "Has completed the church membership process and committed to the local church family.",
  "Serving": "Actively serving in the church through ministry, outreach, hospitality, mentoring, missions, worship, or volunteer leadership.",
  "Leading": "Leading others through Bible studies, small groups, ministry teams, mentoring, or church leadership opportunities.",
  "Discipleship": "Intentionally investing in others by mentoring, teaching, evangelizing, and multiplying disciples for Christ.",
};

export const MINISTRY_CONFIG: Record<string, MinistryConfig> = {
  childrens: {
    name: "Children's Ministry",
    label: "Children's Ministry",
    emoji: "🧒",
    grades: ["3rd", "4th", "5th", "6th"],
    pipelineStages: CHILDREN_PIPELINE_STAGES,
    stages: CHILDREN_PIPELINE_STAGES,
    hasShepherdGroups: true,
    hasGrowthModule: false,
    invitationOnly: false,
    hasMetamorphosis: true,
    metamorphosisRole: 'sending',
    volunteerGrades: [],
    stageDescriptions: {
      "Visitor": "First-time guest",
      "Regular": "Attended 4+ times",
      "Engaged": "Participates and builds relationships",
      "Growing in Faith": "Learning God's Word, prayer, and Biblical truth",
      "Faith Decision": "Made a personal decision to follow Jesus Christ",
      "Baptism": "Publicly declared faith through baptism",
      "Discipleship Step": "Becoming part of a team and helping others grow",
      "Leadership": "Leading a team and helping others grow",
    },
  },
  "young-adults": {
    name: "Young Adults",
    label: "Young Adults",
    emoji: "🎉",
    ageRange: "Ages 18–30",
    pipelineStages: YOUNG_ADULTS_PIPELINE_STAGES,
    stages: YOUNG_ADULTS_PIPELINE_STAGES,
    hasShepherdGroups: false,
    hasGrowthModule: true,
    invitationOnly: false,
    hasMetamorphosis: false,
    metamorphosisMentorEligible: true,
    stageDescriptions: {
      "Visitor": "First-time guest or new attendee exploring the ministry.",
      "Regular": "Attending consistently and building relationships within the ministry.",
      "Faith Decision": "Has made a personal decision to trust Christ or recommit their life to Him.",
      "Baptism": "Has publicly professed their faith through believer's baptism.",
      "Membership": "Has completed the church membership process and committed to the local church family.",
      "Serving": "Actively serving in a ministry, outreach, worship team, hospitality, children's ministry, or another area of the church.",
      "Leading": "Leading others through a small group, ministry team, class, mentoring relationship, or volunteer leadership role.",
      "Discipleship": "Intentionally discipling others and multiplying their faith through mentoring, teaching, evangelism, and spiritual leadership.",
    },
  },
  mens: {
    name: "Men's Ministry",
    label: "Men's Ministry",
    emoji: "👔",
    pipelineStages: YOUNG_ADULTS_PIPELINE_STAGES,
    stages: YOUNG_ADULTS_PIPELINE_STAGES,
    hasShepherdGroups: false,
    hasGrowthModule: true,
    invitationOnly: false,
    hasMetamorphosis: false,
    autoPopulateGender: 'male',
    stageDescriptions: ADULT_MINISTRY_STAGE_DESCRIPTIONS,
  },
  womens: {
    name: "Women's Ministry",
    label: "Women's Ministry",
    emoji: "👗",
    pipelineStages: YOUNG_ADULTS_PIPELINE_STAGES,
    stages: YOUNG_ADULTS_PIPELINE_STAGES,
    hasShepherdGroups: false,
    hasGrowthModule: true,
    invitationOnly: false,
    hasMetamorphosis: false,
    autoPopulateGender: 'female',
    stageDescriptions: ADULT_MINISTRY_STAGE_DESCRIPTIONS,
  },
  seniors: {
    name: "Senior Ministry",
    label: "Senior Ministry",
    emoji: "🌟",
    ageRange: "Ages 55+",
    pipelineStages: YOUNG_ADULTS_PIPELINE_STAGES,
    stages: YOUNG_ADULTS_PIPELINE_STAGES,
    hasShepherdGroups: false,
    hasGrowthModule: true,
    invitationOnly: false,
    hasMetamorphosis: false,
    autoPopulateMinAge: 55,
    stageDescriptions: ADULT_MINISTRY_STAGE_DESCRIPTIONS,
  },
  ushers: {
    name: "Ushers Ministry",
    label: "Ushers Ministry",
    emoji: "🎩",
    pipelineStages: ["New", "Training", "Active", "Senior Usher", "Head Usher"],
    stages: ["New", "Training", "Active", "Senior Usher", "Head Usher"],
    hasShepherdGroups: false,
    hasGrowthModule: false,
    invitationOnly: true,
    hasMetamorphosis: false,
  },
  drama: {
    name: "Drama & Skit Ministry",
    label: "Drama & Skit Ministry",
    emoji: "🎭",
    pipelineStages: ["New", "Ensemble", "Featured", "Lead", "Director Track"],
    stages: ["New", "Ensemble", "Featured", "Lead", "Director Track"],
    hasShepherdGroups: false,
    hasGrowthModule: false,
    invitationOnly: true,
    hasMetamorphosis: false,
  },
};

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

export const STAGE_COLORS = [
  "#6b7280",
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#7c3aed",
  "#0891b2",
  "#ea580c",
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
    if (age >= 8 && age < 12) types.push('childrens');
    if (age >= 18 && age < 30) types.push('young-adults');
    if (age >= 55) types.push('seniors');

    if (age >= 18) {
      if (member.gender === 'male') types.push('mens');
      if (member.gender === 'female') types.push('womens');
    }
  } else {
    if (member.gender === 'male') types.push('mens');
    if (member.gender === 'female') types.push('womens');
  }

  if (types.length === 0 && member.member_type === 'child') types.push('childrens');

  return types;
}

export const MINISTRY_NAV_ITEMS = [
  { label: "🧒 Children's Ministry", href: "/dashboard/ministry/childrens" },
  { label: "🎉 Young Adults", href: "/dashboard/ministry/young-adults" },
  { label: "👔 Men's Ministry", href: "/dashboard/ministry/mens" },
  { label: "👗 Women's Ministry", href: "/dashboard/ministry/womens" },
  { label: "🌟 Senior Ministry", href: "/dashboard/ministry/seniors" },
  { label: "🎩 Ushers Ministry", href: "/dashboard/ministry/ushers" },
  { label: "🎭 Drama & Skit", href: "/dashboard/ministry/drama" },
  { label: "🏠 Bible Study Pods", href: "/dashboard/bible-study-pods" },
];
