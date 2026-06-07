export type MinistryConfig = {
  name: string;
  emoji: string;
  stages: string[];
  hasShepherdGroups: boolean;

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

export const CHILDREN_PIPELINE_STAGES = [
  "Visitor",
  "Regular",
  "Engaged",
  "Growing in God's Word",
  "Faith Decision",
  "Baptism",
  "Discipleship Step",
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

export const MINISTRY_CONFIG: Record<string, MinistryConfig> = {
  childrens: {
    name: "Children's Ministry",
    label: "Children's Ministry",
    emoji: "🧒",
    grades: ["3rd", "4th", "5th", "6th"],
    pipelineStages: CHILDREN_PIPELINE_STAGES,
    stages: CHILDREN_PIPELINE_STAGES,
    hasShepherdGroups: true,
    hasTeamChallenge: true,
    hasGrowthModule: false,
    invitationOnly: false,
    hasMetamorphosis: true,
    metamorphosisRole: 'sending',
    volunteerGrades: [],
    stageDescriptions: {
      "Visitor": "First-time guest",
      "Regular": "Attends 4+ times",
      "Engaged": "Participates and builds relationships",
      "Growing in God's Word": "Learning God’s Word, prayer, and Bible truth",
      "Faith Decision": "Made a personal decision to follow Christ",
      "Baptism": "Publicly declared faith through baptism",
      "Discipleship Step": "Taking next steps in discipleship and helping others grow",
    },
  },
  "middle-school": {
    name: "Middle School",
    label: "Middle School",
    emoji: "🎒",
    ageRange: "7th–8th Grade",
    grades: ["7th", "8th"],
    pipelineStages: CHILDREN_PIPELINE_STAGES,
    stages: CHILDREN_PIPELINE_STAGES,
    hasShepherdGroups: true,
    hasTeamChallenge: true,
    hasGrowthModule: false,
    invitationOnly: false,
    hasMetamorphosis: true,
    metamorphosisRole: 'receiving',
    volunteerGrades: [],
    stageDescriptions: {
      "Visitor": "First-time guest",
      "Regular": "Attends 4+ times",
      "Engaged": "Participates and builds relationships",
      "Growing in God's Word": "Learning God's Word, prayer, and Bible truth",
      "Faith Decision": "Made a personal decision to follow Christ",
      "Baptism": "Publicly declared faith through baptism",
      "Discipleship Step": "Taking next steps in discipleship and helping others grow",
    },
  },
  "high-school": {
    name: "High School",
    label: "High School",
    emoji: "🎓",
    ageRange: "9th–12th Grade",
    grades: ["9th", "10th", "11th", "12th"],
    pipelineStages: CHILDREN_PIPELINE_STAGES,
    stages: CHILDREN_PIPELINE_STAGES,
    hasShepherdGroups: true,
    hasTeamChallenge: true,
    hasGrowthModule: false,
    invitationOnly: false,
    hasMetamorphosis: true,
    metamorphosisRole: 'receiving',
    metamorphosisMentorGrades: ["11th", "12th"],
    volunteerGrades: ["11th", "12th"],
    stageDescriptions: {
      "Visitor": "First-time guest",
      "Regular": "Attends 4+ times",
      "Engaged": "Participates and builds relationships",
      "Growing in God's Word": "Learning God's Word, prayer, and Bible truth",
      "Faith Decision": "Made a personal decision to follow Christ",
      "Baptism": "Publicly declared faith through baptism",
      "Discipleship Step": "Taking next steps in discipleship and helping others grow",
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
    hasTeamChallenge: false,
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
    pipelineStages: ["Visitor", "Regular", "Accountability Group", "Serving", "Mentoring", "Leading"],
    stages: ["Visitor", "Regular", "Accountability Group", "Serving", "Mentoring", "Leading"],
    hasShepherdGroups: false,
    hasTeamChallenge: false,
    hasGrowthModule: true,
    invitationOnly: false,
    hasMetamorphosis: false,
    autoPopulateGender: 'male',
  },
  womens: {
    name: "Women's Ministry",
    label: "Women's Ministry",
    emoji: "👗",
    pipelineStages: ["Visitor", "Regular", "Bible Study", "Serving", "Mentoring", "Leading"],
    stages: ["Visitor", "Regular", "Bible Study", "Serving", "Mentoring", "Leading"],
    hasShepherdGroups: false,
    hasTeamChallenge: false,
    hasGrowthModule: true,
    invitationOnly: false,
    hasMetamorphosis: false,
    autoPopulateGender: 'female',
  },
  seniors: {
    name: "Senior Ministry",
    label: "Senior Ministry",
    emoji: "🌟",
    ageRange: "Ages 55+",
    pipelineStages: ["Visitor", "Regular", "Connected", "Mentor", "Legacy"],
    stages: ["Visitor", "Regular", "Connected", "Mentor", "Legacy"],
    hasShepherdGroups: false,
    hasTeamChallenge: false,
    hasGrowthModule: true,
    invitationOnly: false,
    hasMetamorphosis: false,
    autoPopulateMinAge: 55,
  },
  ushers: {
    name: "Ushers Ministry",
    label: "Ushers Ministry",
    emoji: "🎩",
    pipelineStages: ["New", "Training", "Active", "Senior Usher", "Head Usher"],
    stages: ["New", "Training", "Active", "Senior Usher", "Head Usher"],
    hasShepherdGroups: false,
    hasTeamChallenge: false,
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
    hasTeamChallenge: false,
    hasGrowthModule: false,
    invitationOnly: true,
    hasMetamorphosis: false,
  },
};

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
    if (age >= 12 && age < 14) types.push('middle-school');
    if (age >= 14 && age < 18) types.push('high-school');
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
  { label: "🎒 Middle School", href: "/dashboard/ministry/middle-school" },
  { label: "🎓 High School", href: "/dashboard/ministry/high-school" },
  { label: "🎉 Young Adults", href: "/dashboard/ministry/young-adults" },
  { label: "👔 Men's Ministry", href: "/dashboard/ministry/mens" },
  { label: "👗 Women's Ministry", href: "/dashboard/ministry/womens" },
  { label: "🌟 Senior Ministry", href: "/dashboard/ministry/seniors" },
  { label: "🎩 Ushers Ministry", href: "/dashboard/ministry/ushers" },
  { label: "🎭 Drama & Skit", href: "/dashboard/ministry/drama" },
  { label: "🏠 Bible Study Pods", href: "/dashboard/bible-study-pods" },
];