import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read .env.local manually (no dotenv dependency needed)
const envPath = path.resolve(__dirname, '../.env.local');
const envVars: Record<string, string> = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0) {
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      envVars[key] = val;
    }
  });
}

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'] ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceRoleKey = envVars['SUPABASE_SERVICE_ROLE_KEY'] ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey);

function dob(gradeLabel: string): string {
  const now = new Date();
  const year = now.getFullYear();
  // Grade → typical age → birth year (approximate)
  const ages: Record<string, number> = {
    '3rd': 9,
    '4th': 10,
    '5th': 11,
    '6th': 12,
  };
  const age = ages[gradeLabel] ?? 10;
  const birthYear = year - age;
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  return `${birthYear}-${month}-${day}`;
}

const TEST_CHILDREN = [
  // 3rd Grade
  {
    first_name: 'Emma',    last_name: 'Thornton', grade: '3rd',
    parent1_name: 'Sarah Thornton',  parent1_email: 'sarah.thornton@example.com',  parent1_phone: '(555) 201-0101',
    allergies: 'Peanuts',
  },
  {
    first_name: 'Liam',    last_name: 'Vasquez',  grade: '3rd',
    parent1_name: 'Carlos Vasquez',  parent1_email: 'carlos.vasquez@example.com',  parent1_phone: '(555) 201-0102',
    allergies: null,
  },
  {
    first_name: 'Ava',     last_name: 'Mitchell', grade: '3rd',
    parent1_name: 'Rachel Mitchell', parent1_email: 'rachel.mitchell@example.com', parent1_phone: '(555) 201-0103',
    allergies: 'Dairy',
  },
  // 4th Grade
  {
    first_name: 'Noah',    last_name: 'Garner',   grade: '4th',
    parent1_name: 'David Garner',    parent1_email: 'david.garner@example.com',    parent1_phone: '(555) 201-0104',
    allergies: null,
  },
  {
    first_name: 'Sophia',  last_name: 'Patel',    grade: '4th',
    parent1_name: 'Priya Patel',     parent1_email: 'priya.patel@example.com',     parent1_phone: '(555) 201-0105',
    allergies: 'Tree nuts',
  },
  {
    first_name: 'Jackson', last_name: 'Brooks',   grade: '4th',
    parent1_name: 'Tina Brooks',     parent1_email: 'tina.brooks@example.com',     parent1_phone: '(555) 201-0106',
    allergies: null,
  },
  // 5th Grade
  {
    first_name: 'Olivia',  last_name: 'Reeves',   grade: '5th',
    parent1_name: 'Mark Reeves',     parent1_email: 'mark.reeves@example.com',     parent1_phone: '(555) 201-0107',
    allergies: null,
  },
  {
    first_name: 'Elijah',  last_name: 'Cummings', grade: '5th',
    parent1_name: 'Angela Cummings', parent1_email: 'angela.cummings@example.com', parent1_phone: '(555) 201-0108',
    allergies: 'Shellfish',
  },
  {
    first_name: 'Mia',     last_name: 'Henderson',grade: '5th',
    parent1_name: 'James Henderson', parent1_email: 'james.henderson@example.com', parent1_phone: '(555) 201-0109',
    allergies: null,
  },
  // 6th Grade
  {
    first_name: 'Lucas',   last_name: 'Walsh',    grade: '6th',
    parent1_name: 'Patricia Walsh',  parent1_email: 'patricia.walsh@example.com',  parent1_phone: '(555) 201-0110',
    allergies: null,
  },
  {
    first_name: 'Isabella',last_name: 'Freeman',  grade: '6th',
    parent1_name: 'Kevin Freeman',   parent1_email: 'kevin.freeman@example.com',   parent1_phone: '(555) 201-0111',
    allergies: 'Eggs',
  },
  {
    first_name: 'Aiden',   last_name: 'Nguyen',   grade: '6th',
    parent1_name: 'Linh Nguyen',     parent1_email: 'linh.nguyen@example.com',     parent1_phone: '(555) 201-0112',
    allergies: null,
  },
];

async function main() {
  // Get first church
  const { data: churches, error: churchErr } = await admin.from('churches').select('id, name').limit(1);
  if (churchErr || !churches?.length) {
    console.error('No churches found:', churchErr?.message);
    process.exit(1);
  }
  const church = churches[0];
  console.log(`Using church: ${church.name} (${church.id})`);

  // Get active season (optional — used for display only)
  const { data: seasons } = await admin
    .from('children_ministry_seasons')
    .select('id, name, status')
    .eq('church_id', church.id)
    .eq('status', 'active')
    .limit(1);
  const season = seasons?.[0] ?? null;
  if (season) {
    console.log(`Active season: ${season.name}`);
  } else {
    console.log('No active season found — children will be inserted without season assignment.');
  }

  // Build insert rows
  const rows = TEST_CHILDREN.map(c => ({
    church_id: church.id,
    first_name: c.first_name,
    last_name: c.last_name,
    grade: c.grade,
    date_of_birth: dob(c.grade),
    allergies: c.allergies ?? null,
    medical_notes: null,
    parent1_name: c.parent1_name,
    parent1_email: c.parent1_email,
    parent1_phone: c.parent1_phone,
    parent2_name: null,
    parent2_email: null,
    parent2_phone: null,
    authorized_pickups: [],
    photo_permission: false,
    active: true,
  }));

  const { data: inserted, error: insertErr } = await admin
    .from('children_ministry_children')
    .insert(rows)
    .select('id, first_name, last_name, grade');

  if (insertErr) {
    console.error('Insert error:', insertErr.message);
    process.exit(1);
  }

  console.log(`\n✅ Inserted ${inserted?.length ?? 0} children:\n`);
  for (const c of inserted ?? []) {
    console.log(`  ${c.first_name} ${c.last_name} (${c.grade})`);
  }

  if (season && inserted?.length) {
    console.log('\nNote: To assign children to teams, use the Teams page in the dashboard.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
