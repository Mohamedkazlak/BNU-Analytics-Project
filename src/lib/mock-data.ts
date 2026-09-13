import type {
  Attempt,
  Course,
  DemoUser,
  Enrollment,
  Exam,
  OrgScope,
  QuestionItem,
  Student,
} from "./types";
import type {
  AcademicYearRow,
  CourseOfferingRow,
  CourseRow,
  CourseSectionRow,
  EnrollmentRow,
  ExamAttemptRow,
  ExamRow,
  IntegrityFlagRow,
  PersonRow,
  QuestionRow,
  StaffCourseAssignmentRow,
  StaffRow,
  StudentRow,
  TermRow,
  TranscriptEntryRow,
  UserAccountRow,
} from "./schema";

export const UNIVERSITY_SCOPE_ID = "uni-bnu";
export const ACADEMIC_AFFAIRS_SCOPE_ID = "prog-computer-science";
export const CURRENT_ACADEMIC_YEAR_ID = "2025/26";
export const CURRENT_TERM_ID = "term-2025-spring";
export const passMark = 60;
export const currentStudentId = "s7";

export const orgScopes: OrgScope[] = [
  {
    id: UNIVERSITY_SCOPE_ID,
    level: "university",
    parentId: null,
    code: "BNU",
    name: "Benha National University",
    titleForRole: "President",
  },
  {
    id: "sec-engineering",
    level: "sector",
    parentId: UNIVERSITY_SCOPE_ID,
    code: "ENG-SEC",
    name: "Engineering and Basic & Applied Sciences",
    titleForRole: "Dean, Engineering and Basic & Applied Sciences Sector",
  },
  {
    id: "prog-engineering",
    level: "program",
    parentId: "sec-engineering",
    code: "ENG",
    name: "Engineering",
    titleForRole: "Program Director, Engineering",
  },
  {
    id: "prog-energy-sciences",
    level: "program",
    parentId: "sec-engineering",
    code: "ENE",
    name: "Energy Sciences",
    titleForRole: "Program Director, Energy Sciences",
  },
  {
    id: ACADEMIC_AFFAIRS_SCOPE_ID,
    level: "program",
    parentId: "sec-engineering",
    code: "CS",
    name: "Computer Science",
    titleForRole: "Program Director, Computer Science",
  },
  {
    id: "sec-health",
    level: "sector",
    parentId: UNIVERSITY_SCOPE_ID,
    code: "HLTH-SEC",
    name: "Health Sciences",
    titleForRole: "Dean, Health Sciences Sector",
  },
  {
    id: "prog-medicine",
    level: "program",
    parentId: "sec-health",
    code: "MED",
    name: "Medicine",
    titleForRole: "Program Director, Medicine",
  },
  {
    id: "prog-dentistry",
    level: "program",
    parentId: "sec-health",
    code: "DEN",
    name: "Dentistry",
    titleForRole: "Program Director, Dentistry",
  },
  {
    id: "prog-physical-therapy",
    level: "program",
    parentId: "sec-health",
    code: "PT",
    name: "Physical Therapy",
    titleForRole: "Program Director, Physical Therapy",
  },
  {
    id: "prog-veterinary",
    level: "program",
    parentId: "sec-health",
    code: "VET",
    name: "Veterinary",
    titleForRole: "Program Director, Veterinary",
  },
  {
    id: "sec-humanities",
    level: "sector",
    parentId: UNIVERSITY_SCOPE_ID,
    code: "HUM-SEC",
    name: "Literature, Arts and Humanities",
    titleForRole: "Dean, Literature, Arts and Humanities Sector",
  },
  {
    id: "prog-visual-arts",
    level: "program",
    parentId: "sec-humanities",
    code: "ART",
    name: "Visual Arts and Design",
    titleForRole: "Program Director, Visual Arts and Design",
  },
  {
    id: "prog-economics",
    level: "program",
    parentId: "sec-humanities",
    code: "ECO",
    name: "Economics and Business Administration",
    titleForRole: "Program Director, Economics and Business Administration",
  },
];

const programScopes = orgScopes.filter((s) => s.level === "program");

export function orgScopeById(id: string): OrgScope | undefined {
  return orgScopes.find((s) => s.id === id);
}

export interface UserAffiliation {
  university: string;
  /** Sector name when scoped to sector or program; null at university-wide. */
  sector: string | null;
  /** Program / college name when scoped to a program; null otherwise. */
  college: string | null;
  /** Short line for UI chips, e.g. "Engineering · Computer Science". */
  label: string;
}

/** Resolve sector + college (program) from an org scope_id. null = university-wide. */
export function affiliationForScope(scopeId?: string | null): UserAffiliation {
  const university =
    orgScopeById(UNIVERSITY_SCOPE_ID)?.name ?? "Benha National University";

  if (!scopeId) {
    return {
      university,
      sector: null,
      college: null,
      label: "University-wide",
    };
  }

  const node = orgScopeById(scopeId);
  if (!node || node.level === "university") {
    return {
      university: node?.name ?? university,
      sector: null,
      college: null,
      label: "University-wide",
    };
  }

  if (node.level === "sector") {
    return {
      university,
      sector: node.name,
      college: null,
      label: node.name,
    };
  }

  const sector = node.parentId ? orgScopeById(node.parentId) : undefined;
  return {
    university,
    sector: sector?.name ?? null,
    college: node.name,
    label: sector ? `${sector.name} · ${node.name}` : node.name,
  };
}

/**
 * Human-facing role title. University-scoped senior_management is President or
 * VP; sector-scoped senior_management reads as "Sector Dean".
 */
export function displayRoleLabel(user: DemoUser): string {
  if (user.role === "senior_management") {
    const node = user.scopeId ? orgScopeById(user.scopeId) : undefined;
    if (node?.level === "sector") return "Sector Dean";
    if (/vp/i.test(user.title)) return "VP for Academic Affairs";
    if (/president/i.test(user.title)) return "University President";
    return "Senior Management";
  }
  const labels: Record<DemoUser["role"], string> = {
    senior_management: "Senior Management",
    program_director: "Program Director",
    academic_affairs: "Academic Affairs",
    professor: "Professor",
    it_academic_integrity: "IT · Academic Integrity",
    student: "Student",
  };
  return labels[user.role];
}

/** Program names covered by a node. `undefined` scope = entire university. */
export function programNamesInScope(scopeId?: string | null): string[] {
  if (!scopeId) return programScopes.map((s) => s.name);
  const node = orgScopeById(scopeId);
  if (!node || node.level === "university")
    return programScopes.map((s) => s.name);
  if (node.level === "program") return [node.name];
  return orgScopes
    .filter((s) => s.parentId === node.id && s.level === "program")
    .map((s) => s.name);
}

export function sectorNameForProgram(program: string): string {
  const prog = programScopes.find((s) => s.name === program);
  const sector = prog ? orgScopeById(prog.parentId!) : undefined;
  return sector?.name ?? "";
}

function programById(id: string): OrgScope {
  return orgScopeById(id)!;
}

function sectorForProgramId(programId: string): OrgScope {
  const program = programById(programId);
  return orgScopeById(program.parentId!)!;
}

function slugEmail(fullName: string, domain = "bnu.edu.eg") {
  return `${fullName
    .toLowerCase()
    .replace(/^dr\. |^prof\. /, "")
    .replace(/[^a-z]+/g, ".")
    .replace(/^\.+|\.+$/g, "")}@${domain}`;
}

function initialsOf(fullName: string) {
  const parts = fullName.replace(/^(Dr|Prof)\.\s+/, "").split(" ");
  return `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`.toUpperCase();
}

/** Deterministic PRNG so server and client render identical mock data. */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const rng = makeRng(20260904);

/** Sum of uniforms -> bell-curve-ish spread. */
function normal(mean: number, sd: number) {
  const u = rng() + rng() + rng() + rng() + rng() + rng() - 3;
  return mean + u * sd;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/* ---------------------------------------------------------------------------
 * ACADEMIC CALENDAR
 * ------------------------------------------------------------------------- */

export const academicYears: AcademicYearRow[] = [
  {
    id: "2023/24",
    label: "2023/24",
    startDate: "2023-09-17",
    endDate: "2024-06-20",
    isCurrent: false,
  },
  {
    id: "2024/25",
    label: "2024/25",
    startDate: "2024-09-15",
    endDate: "2025-06-19",
    isCurrent: false,
  },
  {
    id: CURRENT_ACADEMIC_YEAR_ID,
    label: CURRENT_ACADEMIC_YEAR_ID,
    startDate: "2025-09-14",
    endDate: "2026-06-18",
    isCurrent: true,
  },
];

export const terms: TermRow[] = [
  {
    id: "term-2023-spring",
    academicYearId: "2023/24",
    code: "spring",
    name: "Spring 2024",
    startDate: "2024-02-04",
    endDate: "2024-06-20",
  },
  {
    id: "term-2024-spring",
    academicYearId: "2024/25",
    code: "spring",
    name: "Spring 2025",
    startDate: "2025-02-02",
    endDate: "2025-06-19",
  },
  {
    id: CURRENT_TERM_ID,
    academicYearId: CURRENT_ACADEMIC_YEAR_ID,
    code: "spring",
    name: "Spring 2026",
    startDate: "2026-02-01",
    endDate: "2026-06-18",
  },
];

/* ---------------------------------------------------------------------------
 * PEOPLE / STAFF
 * Instructors are first-class people, not free-text on courses.
 * ------------------------------------------------------------------------- */

export const people: PersonRow[] = [
  { id: "p-priya-raman", fullName: "Dr. Priya Raman", email: slugEmail("Priya Raman") },
  { id: "p-karim-fawzy", fullName: "Prof. Karim Fawzy", email: slugEmail("Karim Fawzy") },
  { id: "p-hana-elmasry", fullName: "Dr. Hana El-Masry", email: slugEmail("Hana El-Masry") },
  { id: "p-daniel-osei", fullName: "Prof. Daniel Osei", email: slugEmail("Daniel Osei") },
  { id: "p-sara-mansour", fullName: "Sara Mansour", email: slugEmail("Sara Mansour") },
  { id: "p-tomas-oyelaran", fullName: "Prof. Tomas Oyelaran", email: slugEmail("Tomas Oyelaran") },
  { id: "p-layla-nasser", fullName: "Layla Nasser", email: slugEmail("Layla Nasser") },
  { id: "p-yasser-mansour", fullName: "Prof. Yasser Mansour", email: slugEmail("Yasser Mansour") },
  { id: "p-mai-khalil", fullName: "Dr. Mai Khalil", email: slugEmail("Mai Khalil") },
  { id: "p-tarek-fouad", fullName: "Dr. Tarek Fouad", email: slugEmail("Tarek Fouad") },
  { id: "p-yasmin-adel", fullName: "Dr. Yasmin Adel", email: slugEmail("Yasmin Adel") },
  { id: "p-walid-naguib", fullName: "Prof. Walid Naguib", email: slugEmail("Walid Naguib") },
  { id: "p-amira-saleh", fullName: "Dr. Amira Saleh", email: slugEmail("Amira Saleh") },
  { id: "p-nabil-youssef", fullName: "Prof. Nabil Youssef", email: slugEmail("Nabil Youssef") },
  { id: "p-lina-haddad", fullName: "Prof. Lina Haddad", email: slugEmail("Lina Haddad") },
  { id: "p-nour-elsayed", fullName: "Dr. Nour El-Sayed", email: slugEmail("Nour El-Sayed") },
];

export const staff: StaffRow[] = [
  { personId: "p-priya-raman", title: "University President", orgUnitId: UNIVERSITY_SCOPE_ID },
  { personId: "p-karim-fawzy", title: "VP for Academic Affairs", orgUnitId: UNIVERSITY_SCOPE_ID },
  { personId: "p-hana-elmasry", title: "Dean, Engineering and Basic & Applied Sciences", orgUnitId: "sec-engineering" },
  { personId: "p-daniel-osei", title: "Program Director, Computer Science", orgUnitId: ACADEMIC_AFFAIRS_SCOPE_ID },
  { personId: "p-sara-mansour", title: "Academic Affairs Officer, Computer Science", orgUnitId: ACADEMIC_AFFAIRS_SCOPE_ID },
  { personId: "p-tomas-oyelaran", title: "Professor of Computer Science", orgUnitId: ACADEMIC_AFFAIRS_SCOPE_ID },
  { personId: "p-layla-nasser", title: "IT · Academic Integrity", orgUnitId: UNIVERSITY_SCOPE_ID },
  { personId: "p-yasser-mansour", title: "Professor of Energy Sciences", orgUnitId: "prog-energy-sciences" },
  { personId: "p-mai-khalil", title: "Lecturer of Computer Science", orgUnitId: ACADEMIC_AFFAIRS_SCOPE_ID },
  { personId: "p-tarek-fouad", title: "Lecturer of Computer Science", orgUnitId: ACADEMIC_AFFAIRS_SCOPE_ID },
  { personId: "p-yasmin-adel", title: "Professor of Medicine", orgUnitId: "prog-medicine" },
  { personId: "p-walid-naguib", title: "Professor of Dentistry", orgUnitId: "prog-dentistry" },
  { personId: "p-amira-saleh", title: "Professor of Physical Therapy", orgUnitId: "prog-physical-therapy" },
  { personId: "p-nabil-youssef", title: "Professor of Veterinary Medicine", orgUnitId: "prog-veterinary" },
  { personId: "p-lina-haddad", title: "Professor of Visual Arts", orgUnitId: "prog-visual-arts" },
  { personId: "p-nour-elsayed", title: "Professor of Economics", orgUnitId: "prog-economics" },
];

function personName(id: string) {
  return people.find((p) => p.id === id)?.fullName ?? id;
}

/* ---------------------------------------------------------------------------
 * COURSE CATALOG
 * Current-term offerings keep the existing c1–c11 ids so demo personas stay stable.
 * Historical year-1/year-2 courses exist for transcripts only.
 * ------------------------------------------------------------------------- */

export const courseCatalog: CourseRow[] = [
  { id: "c-eng-110", programId: "prog-engineering", code: "ENG 110", name: "Engineering Drawing", credits: 3, yearLevel: 1 },
  { id: "c-eng-120", programId: "prog-engineering", code: "ENG 120", name: "Mechanics I", credits: 4, yearLevel: 1 },
  { id: "c-eng-130", programId: "prog-engineering", code: "ENG 130", name: "Mechanics II", credits: 4, yearLevel: 2 },
  { id: "c3", programId: "prog-engineering", code: "ENG 210", name: "Statics & Structural Analysis", credits: 4, yearLevel: 3 },
  { id: "c-ene-110", programId: "prog-energy-sciences", code: "ENE 110", name: "Introduction to Energy Systems", credits: 3, yearLevel: 1 },
  { id: "c-ene-120", programId: "prog-energy-sciences", code: "ENE 120", name: "Fluid Mechanics", credits: 4, yearLevel: 1 },
  { id: "c-ene-210", programId: "prog-energy-sciences", code: "ENE 210", name: "Heat Transfer", credits: 3, yearLevel: 2 },
  { id: "c2", programId: "prog-energy-sciences", code: "ENR 220", name: "Thermodynamics of Energy Systems", credits: 4, yearLevel: 3 },
  { id: "c-cs-101", programId: ACADEMIC_AFFAIRS_SCOPE_ID, code: "CS 101", name: "Programming I", credits: 4, yearLevel: 1 },
  { id: "c-cs-102", programId: ACADEMIC_AFFAIRS_SCOPE_ID, code: "CS 102", name: "Discrete Mathematics", credits: 3, yearLevel: 1 },
  { id: "c-cs-103", programId: ACADEMIC_AFFAIRS_SCOPE_ID, code: "MATH 101", name: "Calculus for Computing", credits: 3, yearLevel: 1 },
  { id: "c-cs-203", programId: ACADEMIC_AFFAIRS_SCOPE_ID, code: "CS 203", name: "Computer Organization", credits: 3, yearLevel: 2 },
  { id: "c-cs-204", programId: ACADEMIC_AFFAIRS_SCOPE_ID, code: "CS 204", name: "Software Engineering", credits: 3, yearLevel: 2 },
  { id: "c-cs-205", programId: ACADEMIC_AFFAIRS_SCOPE_ID, code: "CS 205", name: "Computer Networks", credits: 3, yearLevel: 2 },
  { id: "c1", programId: ACADEMIC_AFFAIRS_SCOPE_ID, code: "CS 201", name: "Data Structures & Algorithms", credits: 4, yearLevel: 3 },
  { id: "c10", programId: ACADEMIC_AFFAIRS_SCOPE_ID, code: "CS 202", name: "Database Systems", credits: 3, yearLevel: 3 },
  { id: "c11", programId: ACADEMIC_AFFAIRS_SCOPE_ID, code: "CS 301", name: "Operating Systems", credits: 4, yearLevel: 3 },
  { id: "c-med-110", programId: "prog-medicine", code: "MED 101", name: "Medical Biology", credits: 4, yearLevel: 1 },
  { id: "c-med-120", programId: "prog-medicine", code: "MED 102", name: "Biochemistry I", credits: 3, yearLevel: 1 },
  { id: "c-med-201", programId: "prog-medicine", code: "MED 201", name: "Physiology I", credits: 4, yearLevel: 2 },
  { id: "c4", programId: "prog-medicine", code: "MED 110", name: "Human Anatomy", credits: 5, yearLevel: 3 },
  { id: "c-den-110", programId: "prog-dentistry", code: "DEN 101", name: "Dental Morphology", credits: 3, yearLevel: 1 },
  { id: "c-den-201", programId: "prog-dentistry", code: "DEN 201", name: "Dental Materials", credits: 3, yearLevel: 2 },
  { id: "c5", programId: "prog-dentistry", code: "DEN 120", name: "Oral Biology", credits: 4, yearLevel: 3 },
  { id: "c-pt-110", programId: "prog-physical-therapy", code: "PT 101", name: "Foundations of Rehabilitation", credits: 3, yearLevel: 1 },
  { id: "c-pt-201", programId: "prog-physical-therapy", code: "PT 201", name: "Therapeutic Exercise", credits: 3, yearLevel: 2 },
  { id: "c6", programId: "prog-physical-therapy", code: "PT 130", name: "Kinesiology", credits: 4, yearLevel: 3 },
  { id: "c-vet-110", programId: "prog-veterinary", code: "VET 101", name: "Animal Anatomy", credits: 4, yearLevel: 1 },
  { id: "c-vet-201", programId: "prog-veterinary", code: "VET 201", name: "Veterinary Microbiology", credits: 3, yearLevel: 2 },
  { id: "c7", programId: "prog-veterinary", code: "VET 140", name: "Animal Physiology", credits: 4, yearLevel: 3 },
  { id: "c-art-110", programId: "prog-visual-arts", code: "ART 101", name: "Drawing Fundamentals", credits: 3, yearLevel: 1 },
  { id: "c-art-201", programId: "prog-visual-arts", code: "ART 201", name: "Visual Communication", credits: 3, yearLevel: 2 },
  { id: "c8", programId: "prog-visual-arts", code: "ART 150", name: "Design Studio I", credits: 4, yearLevel: 3 },
  { id: "c-eco-110", programId: "prog-economics", code: "ECO 101", name: "Principles of Economics", credits: 3, yearLevel: 1 },
  { id: "c-eco-201", programId: "prog-economics", code: "ECO 201", name: "Macroeconomic Theory", credits: 3, yearLevel: 2 },
  { id: "c9", programId: "prog-economics", code: "ECO 160", name: "Microeconomic Theory", credits: 3, yearLevel: 3 },
];

const currentCourseIds = new Set([
  "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10", "c11",
]);

const currentInstructorByCourse: Record<string, string> = {
  c1: "p-tomas-oyelaran",
  c2: "p-yasser-mansour",
  c3: "p-hana-elmasry",
  c4: "p-yasmin-adel",
  c5: "p-walid-naguib",
  c6: "p-amira-saleh",
  c7: "p-nabil-youssef",
  c8: "p-lina-haddad",
  c9: "p-nour-elsayed",
  c10: "p-mai-khalil",
  c11: "p-tarek-fouad",
};

export const courseOfferings: CourseOfferingRow[] = [...currentCourseIds].map(
  (courseId) => ({
    id: `off-${courseId}-${CURRENT_ACADEMIC_YEAR_ID}`,
    courseId,
    academicYearId: CURRENT_ACADEMIC_YEAR_ID,
    termId: CURRENT_TERM_ID,
    instructorId: currentInstructorByCourse[courseId]!,
  }),
);

function offeringSectionsFor(courseId: string): string[] {
  const course = courseCatalog.find((c) => c.id === courseId);
  return course?.programId === ACADEMIC_AFFAIRS_SCOPE_ID ||
    course?.programId === "prog-medicine"
    ? ["A", "B", "C"]
    : ["A", "B"];
}

export const courseSections: CourseSectionRow[] = courseOfferings.flatMap(
  (offering) =>
    offeringSectionsFor(offering.courseId).map((code) => ({
      id: `sec-${offering.courseId}-${code}`,
      offeringId: offering.id,
      code,
    })),
);

export const staffCourseAssignments: StaffCourseAssignmentRow[] = Object.entries(
  currentInstructorByCourse,
).map(([courseId, staffPersonId]) => ({ staffPersonId, courseId }));

/* ---------------------------------------------------------------------------
 * STUDENTS
 * Omar Haddad remains s7 so the student persona stays wired.
 * ------------------------------------------------------------------------- */

const studentNamesByProgram: Record<string, [string, string][]> = {
  "prog-engineering": [
    ["Ahmed", "Farouk"],
    ["Mariam", "Helmy"],
    ["Youssef", "Nassar"],
    ["Dina", "Shawky"],
    ["Tarek", "Osman"],
    ["Salma", "Refaat"],
    ["Hassan", "Lotfy"],
    ["Noha", "Samir"],
  ],
  "prog-energy-sciences": [
    ["Karim", "Fathy"],
    ["Aya", "Mostafa"],
    ["Mahmoud", "Saber"],
    ["Reem", "Adel"],
    ["Ziad", "Mansour"],
    ["Hana", "Gaber"],
    ["Amr", "Selim"],
    ["Malak", "Younis"],
  ],
  [ACADEMIC_AFFAIRS_SCOPE_ID]: [
    ["Omar", "Haddad"],
    ["Nour", "El-Amin"],
    ["Yusuf", "Karim"],
    ["Fatma", "Hassan"],
    ["Ali", "Bakr"],
    ["Sara", "Ibrahim"],
    ["Mostafa", "Galal"],
    ["Laila", "Osman"],
    ["Ibrahim", "Shawky"],
    ["Yasmin", "Fouad"],
    ["Khaled", "Naguib"],
    ["Farida", "Amin"],
  ],
  "prog-medicine": [
    ["Hossam", "Ezzat"],
    ["Nadine", "Kamal"],
    ["Sherif", "Tawfik"],
    ["Mona", "Rashad"],
    ["Adel", "Hamdy"],
    ["Rania", "Fouda"],
    ["Bassem", "Lotfi"],
    ["Dalia", "Naguib"],
    ["Wael", "Sorour"],
    ["Heba", "Khalil"],
    ["Sherine", "Awad"],
    ["Tamer", "Ghanem"],
  ],
  "prog-dentistry": [
    ["Mina", "Aziz"],
    ["Nermine", "Saad"],
    ["Fady", "Wahba"],
    ["Christine", "Nabil"],
    ["Rami", "Shenouda"],
    ["Marina", "Fawzy"],
    ["George", "Hanna"],
    ["Yara", "Mounir"],
  ],
  "prog-physical-therapy": [
    ["Menna", "Tallah"],
    ["Omar", "Sami"],
    ["Jana", "Hatem"],
    ["Seif", "Eldin"],
    ["Farah", "Magdy"],
    ["Adam", "Youssef"],
    ["Lina", "Fouad"],
    ["Yassin", "Helal"],
  ],
  "prog-veterinary": [
    ["Amina", "Lotfy"],
    ["Hany", "Darwish"],
    ["Salma", "Gad"],
    ["Nader", "Fahmy"],
    ["Esraa", "Hegazy"],
    ["Kareem", "Anwar"],
    ["Basmala", "Taha"],
    ["Sherif", "Moussa"],
  ],
  "prog-visual-arts": [
    ["Nada", "Sherif"],
    ["Youssef", "Kamal"],
    ["Malak", "Fouad"],
    ["Hassan", "Zaki"],
    ["Farida", "Lotfi"],
    ["Adam", "Nassar"],
    ["Hana", "Samy"],
    ["Zein", "Ashraf"],
  ],
  "prog-economics": [
    ["Omar", "Helmy"],
    ["Salma", "Naguib"],
    ["Karim", "Shawky"],
    ["Nourhan", "Adel"],
    ["Ahmed", "Yassin"],
    ["Maya", "Fawzy"],
    ["Tarek", "Amin"],
    ["Dina", "Lotfy"],
  ],
};

function sectionsForProgram(programId: string): string[] {
  return programId === ACADEMIC_AFFAIRS_SCOPE_ID || programId === "prog-medicine"
    ? ["A", "B", "C"]
    : ["A", "B"];
}

export const studentRows: StudentRow[] = [];
const studentPeople: PersonRow[] = [];

let nextStudentSeq = 1;
function allocateStudentId(reserved?: string) {
  if (reserved) return reserved;
  if (nextStudentSeq === 7) nextStudentSeq = 8;
  return `s${nextStudentSeq++}`;
}

programScopes.forEach((program) => {
  const names = studentNamesByProgram[program.id] ?? [];
  const sections = sectionsForProgram(program.id);
  names.forEach(([first, last], index) => {
    const isOmar = first === "Omar" && last === "Haddad";
    const studentId = allocateStudentId(isOmar ? currentStudentId : undefined);
    const personId = `p-${studentId}`;
    const fullName = `${first} ${last}`;
    studentPeople.push({
      id: personId,
      fullName,
      email: `${first}.${last}.${studentId}@stu.bnu.edu.eg`
        .toLowerCase()
        .replace(/[^a-z0-9.@-]/g, ""),
    });
    studentRows.push({
      id: studentId,
      personId,
      studentNumber: `BNU-${program.code}-24-${String(index + 1).padStart(3, "0")}`,
      programId: program.id,
      section: sections[index % sections.length]!,
      cohortYear: 2023,
      status: "active",
    });
  });
});

people.push(...studentPeople);

export const students: Student[] = studentRows.map((row) => {
  const program = programById(row.programId);
  const sector = sectorForProgramId(row.programId);
  return {
    id: row.id,
    personId: row.personId,
    studentNumber: row.studentNumber,
    name: personName(row.personId),
    programId: row.programId,
    sectorId: sector.id,
    program: program.name,
    sector: sector.name,
    section: row.section,
    cohortYear: row.cohortYear,
  };
});

/* ---------------------------------------------------------------------------
 * OFFERINGS → ENROLLMENTS (students only take courses in their own program)
 * ------------------------------------------------------------------------- */

export const enrollmentRows: EnrollmentRow[] = [];

studentRows.forEach((student) => {
  const offerings = courseOfferings.filter((offering) => {
    const course = courseCatalog.find((c) => c.id === offering.courseId);
    return course?.programId === student.programId;
  });
  offerings.forEach((offering) => {
    const available = courseSections.filter((s) => s.offeringId === offering.id);
    const section =
      available.find((s) => s.code === student.section) ?? available[0]!;
    enrollmentRows.push({
      id: `enr-${student.id}-${offering.courseId}`,
      studentId: student.id,
      offeringId: offering.id,
      sectionId: section.id,
    });
  });
});

export const enrollments: Enrollment[] = enrollmentRows.map((row) => {
  const offering = courseOfferings.find((o) => o.id === row.offeringId)!;
  const section = courseSections.find((s) => s.id === row.sectionId)!;
  return {
    id: row.id,
    studentId: row.studentId,
    courseId: offering.courseId,
    offeringId: row.offeringId,
    sectionId: row.sectionId,
    section: section.code,
    academicYearId: offering.academicYearId,
  };
});

export const courses: Course[] = courseOfferings.map((offering) => {
  const course = courseCatalog.find((c) => c.id === offering.courseId)!;
  const program = programById(course.programId);
  const sector = sectorForProgramId(course.programId);
  const sections = courseSections
    .filter((s) => s.offeringId === offering.id)
    .map((s) => s.code);
  const enrolled = enrollments.filter((e) => e.offeringId === offering.id).length;
  return {
    id: course.id,
    code: course.code,
    name: course.name,
    instructorId: offering.instructorId,
    instructor: personName(offering.instructorId),
    sections,
    enrolled,
    credits: course.credits,
    yearLevel: course.yearLevel,
    programId: course.programId,
    sectorId: sector.id,
    program: program.name,
    sector: sector.name,
  };
});

/* ---------------------------------------------------------------------------
 * EXAMS (current term only)
 * ------------------------------------------------------------------------- */

const examSpecs: {
  courseId: string;
  titles: [string, string];
  dates: [string, string];
  counts: [number, number];
  live?: Exam["status"][];
}[] = [
  {
    courseId: "c1",
    titles: ["Midterm I — Recursion & Trees", "Midterm II — Graphs & Hashing"],
    dates: ["2026-02-18", "2026-04-09"],
    counts: [24, 26],
    live: ["closed", "in_progress"],
  },
  {
    courseId: "c2",
    titles: ["Quiz Series — Energy Balances", "Final Assessment"],
    dates: ["2026-03-03", "2026-06-12"],
    counts: [20, 30],
    live: ["closed", "scheduled"],
  },
  {
    courseId: "c3",
    titles: ["Midterm — Statics", "Design Project Exam"],
    dates: ["2026-03-11", "2026-05-20"],
    counts: [22, 18],
    live: ["closed", "closing"],
  },
  {
    courseId: "c4",
    titles: ["Lab Practical — Anatomy", "Systems Exam"],
    dates: ["2026-03-25", "2026-05-28"],
    counts: [22, 28],
    live: ["closed", "in_progress"],
  },
  {
    courseId: "c5",
    titles: ["Oral Biology Quiz", "Clinical Skills Exam"],
    dates: ["2026-04-02", "2026-06-04"],
    counts: [16, 20],
  },
  {
    courseId: "c6",
    titles: ["Kinesiology Practical", "Movement Analysis Exam"],
    dates: ["2026-03-18", "2026-05-14"],
    counts: [18, 22],
  },
  {
    courseId: "c7",
    titles: ["Physiology Lab", "Species Systems Exam"],
    dates: ["2026-04-08", "2026-06-10"],
    counts: [20, 24],
  },
  {
    courseId: "c8",
    titles: ["Studio Critique", "Visual Culture Exam"],
    dates: ["2026-03-21", "2026-05-16"],
    counts: [14, 16],
  },
  {
    courseId: "c9",
    titles: ["Markets Quiz", "Policy Analysis Exam"],
    dates: ["2026-04-15", "2026-06-18"],
    counts: [18, 22],
  },
  {
    courseId: "c10",
    titles: ["Midterm — Relational Model", "Query Processing Exam"],
    dates: ["2026-03-12", "2026-05-21"],
    counts: [22, 24],
  },
  {
    courseId: "c11",
    titles: ["Processes Quiz", "Concurrency Exam"],
    dates: ["2026-04-01", "2026-06-02"],
    counts: [20, 26],
  },
];

export const examRows: ExamRow[] = examSpecs.flatMap((spec, pi) => {
  const offering = courseOfferings.find((o) => o.courseId === spec.courseId)!;
  return spec.titles.map((title, ti) => ({
    id: `e${pi * 2 + ti + 1}`,
    offeringId: offering.id,
    title,
    scheduledAt: `${spec.dates[ti]!}T09:00:00+02:00`,
    durationMinutes: 90,
    questionCount: spec.counts[ti]!,
    passMark,
    status: spec.live?.[ti] ?? "closed",
  }));
});

export const exams: Exam[] = examRows.map((row) => {
  const offering = courseOfferings.find((o) => o.id === row.offeringId)!;
  const course = courseCatalog.find((c) => c.id === offering.courseId)!;
  return {
    id: row.id,
    courseId: course.id,
    offeringId: row.offeringId,
    courseCode: course.code,
    title: row.title,
    date: row.scheduledAt.slice(0, 10),
    questionCount: row.questionCount,
    passMark: row.passMark,
    status: row.status,
  };
});

/* ---------------------------------------------------------------------------
 * ATTEMPTS — one roster row per enrollment × exam
 * ------------------------------------------------------------------------- */

const ability = studentRows.map(() => normal(0, 9));
const studentIndex = new Map(studentRows.map((s, i) => [s.id, i]));

const devices = [
  "MacBook Pro · Chrome 131",
  "Windows 11 · Edge 130",
  "iPad Air · Safari 18",
  "Windows 10 · Chrome 130",
  "Linux · Firefox 133",
  "iPhone 15 · Safari 18",
];

const courseBias: Record<string, number> = {
  c1: -2,
  c2: 4,
  c3: 0,
  c4: -5,
  c10: 1,
  c11: -3,
};

function ip(i: number) {
  return `10.${24 + (i % 4)}.${12 + (i % 17)}.${(i * 7) % 240}`;
}

function isoAt(date: string, hour: number, minute: number) {
  return `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

export const examAttemptRows: ExamAttemptRow[] = [];
export const integrityFlags: IntegrityFlagRow[] = [];

exams.forEach((exam, ei) => {
  const courseEnrollments = enrollments.filter((e) => e.courseId === exam.courseId);
  courseEnrollments.forEach((enrollment) => {
    const si = studentIndex.get(enrollment.studentId) ?? 0;
    const student = students.find((s) => s.id === enrollment.studentId)!;
    const participated = rng() > 0.06;
    const base =
      67 +
      (courseBias[exam.courseId] ?? 0) +
      (ability[si] ?? 0) +
      normal(0, 9) +
      ei * 0.6;
    const score = Math.round(clamp(base, 18, 100));
    const timeTakenMin = Math.round(clamp(normal(52, 11), 14, 95));
    const startHour = 9 + (si % 3);
    const startMinute = (si * 13) % 60;
    const lateStart = rng() > 0.92;
    const endMinutes = startMinute + timeTakenMin;
    const attemptCount = rng() > 0.94 ? 3 : rng() > 0.88 ? 2 : 1;
    const live =
      exam.status === "in_progress" || exam.status === "closing";
    const status: ExamAttemptRow["status"] = !participated
      ? "absent"
      : live && si % 4 === 0
        ? "in_progress"
        : "submitted";
    const id = `att-${exam.id}-${enrollment.studentId}`;
    examAttemptRows.push({
      id,
      examId: exam.id,
      studentId: enrollment.studentId,
      enrollmentId: enrollment.id,
      score: participated ? score : null,
      timeTakenMin: participated ? timeTakenMin : null,
      startedAt: participated
        ? isoAt(exam.date, startHour + (lateStart ? 1 : 0), startMinute)
        : null,
      endedAt:
        participated && status === "submitted"
          ? isoAt(
              exam.date,
              startHour + Math.floor(endMinutes / 60),
              endMinutes % 60,
            )
          : null,
      ip: participated ? ip(si + ei) : null,
      device: participated ? devices[(si + ei) % devices.length]! : null,
      attemptCount,
      lateStart,
      status,
    });

    if (participated && attemptCount > 1) {
      integrityFlags.push({
        id: `flg-${id}-attempts`,
        attemptId: id,
        flagType: "multiple_attempts",
        detail: `${attemptCount} attempts on this sitting`,
      });
    }
    if (participated && timeTakenMin < 25) {
      integrityFlags.push({
        id: `flg-${id}-fast`,
        attemptId: id,
        flagType: "fast_submission",
        detail: `Submitted in ${timeTakenMin} minutes`,
      });
    }
    if (participated && lateStart) {
      integrityFlags.push({
        id: `flg-${id}-late`,
        attemptId: id,
        flagType: "late_start",
        detail: "Started more than 60 minutes after the scheduled open",
      });
    }
  });
});

export const attempts: Attempt[] = examAttemptRows.map((row) => {
  const student = students.find((s) => s.id === row.studentId)!;
  return {
    id: row.id,
    examId: row.examId,
    studentId: row.studentId,
    enrollmentId: row.enrollmentId,
    score: row.score ?? 0,
    timeTakenMin: row.timeTakenMin ?? 0,
    startedAt: row.startedAt ?? "",
    endedAt: row.endedAt ?? "",
    ip: row.ip ?? "",
    device: row.device ?? "",
    attemptCount: row.attemptCount,
    participated: row.status !== "absent",
    lateStart: row.lateStart,
    status: row.status,
    program: student.program,
    sector: student.sector,
  };
});

/* ---------------------------------------------------------------------------
 * QUESTIONS — topic banks follow the course's program, not CS copy for everyone
 * ------------------------------------------------------------------------- */

const questionBank: Record<string, { topics: string[]; prompts: string[] }> = {
  "prog-engineering": {
    topics: ["Statics", "Free-body diagrams", "Beams", "Trusses", "Stress", "Moments"],
    prompts: [
      "Identify the reaction forces on the simply supported beam.",
      "Which member of the truss is in compression?",
      "Compute the bending moment at midspan.",
      "Select the correct free-body diagram for the frame.",
      "State the sign convention used for shear in this section.",
      "Which assumption fails for this slender column?",
    ],
  },
  "prog-energy-sciences": {
    topics: ["Energy balances", "Cycles", "Heat transfer", "Fuels", "Thermodynamics", "Exergy"],
    prompts: [
      "Apply the first law to the open system below.",
      "Which cycle has the higher thermal efficiency at the same temperature limits?",
      "Identify the heat-transfer mode that dominates in the furnace wall.",
      "Compute the lower heating value implied by the flue-gas data.",
      "Where is the largest exergy destruction in this plant?",
      "State the assumption required to treat the turbine as isentropic.",
    ],
  },
  [ACADEMIC_AFFAIRS_SCOPE_ID]: {
    topics: ["Recursion", "Complexity Analysis", "Graph Traversal", "Hashing", "Sorting", "Dynamic Programming", "Trees & Heaps", "Concurrency"],
    prompts: [
      "Which traversal visits the left subtree before the node?",
      "State the worst-case complexity of quicksort and justify it.",
      "Identify the invariant maintained by the loop below.",
      "Given the adjacency list, compute the shortest path length.",
      "Which collision strategy degrades first under high load factor?",
      "Rewrite the recurrence in closed form.",
      "Select the heap operation with logarithmic cost.",
      "Explain why the greedy choice fails on this input.",
    ],
  },
  "prog-medicine": {
    topics: ["Anatomy", "Histology", "Physiology", "Clinical signs", "Embryology", "Neuroanatomy"],
    prompts: [
      "Identify the structure labelled on the cadaveric image.",
      "Which nerve is at risk in this surgical approach?",
      "Select the epithelial type lining this organ.",
      "Which finding is most consistent with the lesion described?",
      "Name the embryonic origin of the indicated tissue.",
      "Which tract is affected given this sensory pattern?",
    ],
  },
  "prog-dentistry": {
    topics: ["Oral biology", "Occlusion", "Caries", "Periodontium", "Dental anatomy", "Materials"],
    prompts: [
      "Identify the tissue layer labelled on the enamel-dentine junction.",
      "Which cusp is involved in this occlusal contact?",
      "Select the most likely site of initial carious attack.",
      "Which fibre group resists the described force?",
      "Name the tooth with this root morphology.",
      "Which material is contraindicated in this restoration?",
    ],
  },
  "prog-physical-therapy": {
    topics: ["Kinesiology", "Gait", "Muscle testing", "Range of motion", "Posture", "Rehabilitation"],
    prompts: [
      "Which muscle is the prime mover in this action?",
      "Identify the gait phase shown in the still.",
      "Select the most valid manual muscle test position.",
      "Which restriction pattern matches this capsular finding?",
      "Name the postural deviation implied by the plumb-line photo.",
      "Which exercise is contraindicated at this stage of rehab?",
    ],
  },
  "prog-veterinary": {
    topics: ["Animal physiology", "Species anatomy", "Clinical pathology", "Pharmacology", "Reproduction", "Nutrition"],
    prompts: [
      "Which species has the digestive physiology described?",
      "Identify the structure on this bovine viscera plate.",
      "Select the lab finding most consistent with this case.",
      "Which drug is contraindicated in this species?",
      "Name the stage of the oestrous cycle shown.",
      "Which ration change addresses the deficiency described?",
    ],
  },
  "prog-visual-arts": {
    topics: ["Composition", "Colour theory", "Typography", "Critique", "Visual culture", "Materials"],
    prompts: [
      "Which compositional principle is dominant in this work?",
      "Select the complementary pair used in the palette.",
      "Identify the typographic classification of the specimen.",
      "Which critique criterion is least well met here?",
      "Name the visual-culture reference the piece quotes.",
      "Which material is unsuitable for this fabrication method?",
    ],
  },
  "prog-economics": {
    topics: ["Demand", "Market structure", "Welfare", "Elasticity", "Policy", "Game theory"],
    prompts: [
      "Which shift explains the price movement in this market?",
      "Identify the market structure implied by the cost curves.",
      "Compute the deadweight loss of the tax shown.",
      "Which elasticity estimate is consistent with the data?",
      "Select the policy that raises surplus in this diagram.",
      "What is the Nash equilibrium of the payoff matrix?",
    ],
  },
};

export const questionRows: QuestionRow[] = exams.flatMap((exam) => {
  const course = courseCatalog.find((c) => c.id === exam.courseId)!;
  const bank = questionBank[course.programId] ?? questionBank[ACADEMIC_AFFAIRS_SCOPE_ID]!;
  return Array.from({ length: Math.min(12, exam.questionCount) }, (_, qi) => ({
    id: `${exam.id}-q${qi + 1}`,
    examId: exam.id,
    number: qi + 1,
    topic: bank.topics[qi % bank.topics.length]!,
    prompt: bank.prompts[qi % bank.prompts.length]!,
    maxScore: 1,
  }));
});

export const questions: QuestionItem[] = questionRows.map((row) => {
  const exam = exams.find((e) => e.id === row.examId)!;
  const pctCorrect = Math.round(clamp(normal(66, 17), 12, 98));
  const discrimination = Number(clamp(normal(0.34, 0.16), -0.12, 0.72).toFixed(2));
  return {
    id: row.id,
    examId: row.examId,
    number: row.number,
    exam: `${exam.courseCode} · ${exam.title.split("—")[0]!.trim()}`,
    topic: row.topic,
    prompt: row.prompt,
    pctCorrect,
    pctIncorrect: 100 - pctCorrect,
    difficultyIndex: Number((pctCorrect / 100).toFixed(2)),
    discriminationIndex: discrimination,
    flagged: discrimination < 0.15 || pctCorrect < 35,
  };
});

/* ---------------------------------------------------------------------------
 * DEMO PERSONAS
 * ------------------------------------------------------------------------- */

export const userAccounts: UserAccountRow[] = [
  { id: "u-president", personId: "p-priya-raman", role: "senior_management", scopeId: UNIVERSITY_SCOPE_ID, studentId: null, isDemo: true },
  { id: "u-vp-aa", personId: "p-karim-fawzy", role: "senior_management", scopeId: UNIVERSITY_SCOPE_ID, studentId: null, isDemo: true },
  { id: "u-dean-eng", personId: "p-hana-elmasry", role: "senior_management", scopeId: "sec-engineering", studentId: null, isDemo: true },
  { id: "u-pd-cs", personId: "p-daniel-osei", role: "program_director", scopeId: ACADEMIC_AFFAIRS_SCOPE_ID, studentId: null, isDemo: true },
  { id: "u-aa-cs", personId: "p-sara-mansour", role: "academic_affairs", scopeId: ACADEMIC_AFFAIRS_SCOPE_ID, studentId: null, isDemo: true },
  { id: "u-prof-cs", personId: "p-tomas-oyelaran", role: "professor", scopeId: ACADEMIC_AFFAIRS_SCOPE_ID, studentId: null, isDemo: true },
  { id: "u-it-integrity", personId: "p-layla-nasser", role: "it_academic_integrity", scopeId: null, studentId: null, isDemo: true },
  { id: "u-student", personId: studentRows.find((s) => s.id === currentStudentId)!.personId, role: "student", scopeId: ACADEMIC_AFFAIRS_SCOPE_ID, studentId: currentStudentId, isDemo: true },
];

export const demoUsers: DemoUser[] = userAccounts.map((account) => {
  const person = people.find((p) => p.id === account.personId)!;
  const staffTitle = staff.find((s) => s.personId === account.personId)?.title;
  const assigned = staffCourseAssignments
    .filter((a) => a.staffPersonId === account.personId)
    .map((a) => a.courseId);
  const title =
    account.role === "student"
      ? "BSc Year 3 · Computer Science"
      : account.role === "professor"
        ? `Professor · ${courses
            .filter((c) => assigned.includes(c.id))
            .map((c) => c.code)
            .join(", ") || "CS 201"}`
        : staffTitle ?? person.fullName;
  return {
    id: account.id,
    name: person.fullName,
    title,
    initials: initialsOf(person.fullName),
    role: account.role,
    scopeId: account.scopeId,
    ...(assigned.length && account.role === "professor" ? { courseIds: assigned.filter((id) => id === "c1") } : {}),
    ...(account.studentId ? { studentId: account.studentId } : {}),
  };
});

export function demoUserById(id: string): DemoUser | undefined {
  return demoUsers.find((u) => u.id === id);
}

export function demoUserForRole(role: DemoUser["role"]): DemoUser {
  return demoUsers.find((u) => u.role === role) ?? demoUsers[0]!;
}

/* ---------------------------------------------------------------------------
 * MULTI-YEAR TRANSCRIPTS
 * Past years use the student's own program curriculum — never another college's courses.
 * The current year is computed from live enrollments + attempts.
 * ------------------------------------------------------------------------- */

export const academicYearsList = academicYears.map((y) => y.id);
export const academicYearsLabels = academicYears.map((y) => y.label);

function letterGrade(avg: number) {
  if (avg >= 90) return "A+";
  if (avg >= 85) return "A";
  if (avg >= 80) return "A-";
  if (avg >= 75) return "B+";
  if (avg >= 70) return "B";
  if (avg >= 65) return "B-";
  if (avg >= 60) return "C";
  if (avg >= 50) return "D";
  return "F";
}

export interface YearCourseGrade {
  course: string;
  average: number;
  grade: string;
  credits: number;
}

export interface YearRecord {
  year: string;
  yearLabel: string;
  average: number;
  gpa: number;
  classAverage: number;
  examsTaken: number;
  passRate: number;
  attendance: number;
  credits: number;
  standing: "Excellent" | "Good standing" | "Watch list" | "At risk";
  courses: YearCourseGrade[];
}

function standingFor(avg: number): YearRecord["standing"] {
  if (avg >= 82) return "Excellent";
  if (avg >= passMark + 5) return "Good standing";
  if (avg >= passMark - 3) return "Watch list";
  return "At risk";
}

function catalogFor(programId: string, yearLevel: number) {
  return courseCatalog.filter(
    (c) =>
      c.programId === programId &&
      c.yearLevel === yearLevel &&
      !currentCourseIds.has(c.id),
  );
}

export const transcriptEntries: TranscriptEntryRow[] = [];

studentRows.forEach((student, si) => {
  academicYears.forEach((year, yi) => {
    if (year.isCurrent) return;
    const yearLevel = yi + 1;
    let list = catalogFor(student.programId, yearLevel);
    if (list.length === 0) {
      list = courseCatalog.filter(
        (c) => c.programId === student.programId && !currentCourseIds.has(c.id),
      ).slice(0, 3);
    }
    if (list.length === 0) {
      list = courseCatalog.filter((c) => c.programId === student.programId).slice(0, 3);
    }
    list.forEach((course, ci) => {
      const average = Number(
        clamp(
          62 + (ability[si] ?? 0) + yi * 3 + ((ci * 11 + si * 3 + yi * 5) % 15) - 7,
          32,
          98,
        ).toFixed(1),
      );
      transcriptEntries.push({
        id: `tr-${student.id}-${course.id}-${year.id}`,
        studentId: student.id,
        courseId: course.id,
        academicYearId: year.id,
        average,
        letterGrade: letterGrade(average),
        credits: course.credits,
      });
    });
  });
});

function currentYearCourses(studentId: string): YearCourseGrade[] {
  const ownEnrollments = enrollments.filter(
    (e) => e.studentId === studentId && e.academicYearId === CURRENT_ACADEMIC_YEAR_ID,
  );
  return ownEnrollments.map((enrollment) => {
    const course = courses.find((c) => c.id === enrollment.courseId)!;
    const examIds = exams.filter((e) => e.courseId === course.id).map((e) => e.id);
    const scores = attempts
      .filter(
        (a) =>
          a.studentId === studentId &&
          examIds.includes(a.examId) &&
          a.participated,
      )
      .map((a) => a.score);
    const average = Number(
      (scores.length
        ? scores.reduce((s, n) => s + n, 0) / scores.length
        : passMark
      ).toFixed(1),
    );
    return {
      course: course.code,
      average,
      grade: letterGrade(average),
      credits: course.credits,
    };
  });
}

export const yearlyRecords: Record<string, YearRecord[]> = {};

students.forEach((student, si) => {
  yearlyRecords[student.id] = academicYears.map((year, yi) => {
    const courseList = year.isCurrent
      ? currentYearCourses(student.id)
      : transcriptEntries
          .filter(
            (t) => t.studentId === student.id && t.academicYearId === year.id,
          )
          .map((t) => {
            const course = courseCatalog.find((c) => c.id === t.courseId);
            return {
              course: course?.code ?? t.courseId,
              average: t.average,
              grade: t.letterGrade,
              credits: t.credits,
            };
          });

    const average = Number(
      (
        courseList.reduce((s, c) => s + c.average, 0) /
        Math.max(1, courseList.length)
      ).toFixed(1),
    );
    const classAverage = Number((67 + yi * 1.4 + (yi % 2 === 0 ? -0.8 : 0.6)).toFixed(1));
    const ownAttempts = attempts.filter(
      (a) => a.studentId === student.id && a.participated,
    );
    const examsTaken = year.isCurrent
      ? ownAttempts.length
      : courseList.length * 2;
    const passRate = Number(
      Math.max(40, Math.min(100, average + 12 - (si % 7))).toFixed(1),
    );
    const attendance = Number(
      Math.max(62, Math.min(100, 88 + ((si * 3 + yi * 9) % 13) - 6)).toFixed(1),
    );

    return {
      year: year.id,
      yearLabel: `Year ${yi + 1}`,
      average,
      gpa: Number(Math.max(0.7, Math.min(4, average / 25 - 0.1)).toFixed(2)),
      classAverage,
      examsTaken,
      passRate,
      attendance,
      credits: courseList.reduce((s, c) => s + c.credits, 0),
      standing: standingFor(average),
      courses: courseList,
    };
  });
});
