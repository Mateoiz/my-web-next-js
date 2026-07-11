export interface Seminar {
  id: string;
  title: string;
  speaker: string;
  programs: string[];
}

// Add one program per seminar (or more if a seminar spans multiple programs).
// Adjust these to whatever programs actually apply — I'm guessing based on
// content (allergy/kidney/nutrition = veterinary-leaning, emergency = general).
export const PROG_DVM = "DVM";
export const PROG_AGRI = "Agriculture";
export const PROG_FT = "Food Technology";

export const PROGRAM_SHORT_LABEL: Record<string, string> = {
  [PROG_DVM]: "DVM",
  [PROG_AGRI]: "Agri",
  [PROG_FT]: "Food Tech",
};

export const SEMINAR_OPTIONS: Seminar[] = [
  {
    id: "aller-genius",
    title: "Aller-Genius: New Frontiers in Veterinary Allergy Care",
    speaker: "Criselda C. Lao, DVM, RN, MAN, USRN, FelPCCP, FelPCVS-CA",
    programs: [PROG_DVM],
  },
  {
    id: "photobiomodulation",
    title: "Use of Photobiomodulation Therapy in Chronic Kidney Disease Cases in the Philippines: A Pilot Study",
    speaker: "Ken Anthony L. Lao, DVM, FelPCCP, FelPCVS-CA",
    programs: [PROG_DVM],
  },
  {
    id: "emergency-topic",
    title: "Emergency Topic",
    speaker: "Nikki & Joshua Sy",
    programs: [PROG_DVM, PROG_AGRI],
  },
  {
    id: "nutrition-surgery",
    title: "Nutrition in Surgery",
    speaker: "Everlyn Austria",
    programs: [PROG_DVM],
  },
  {
    id: "water-microbiology",
    title: "From Source to Safety: The Importance of Water Microbiology in Public Health and Food System",
    speaker: "Dr. Emeliza Laurenciana, MBA",
    programs: [PROG_FT],
  },
];

export type SeminarId = typeof SEMINAR_OPTIONS[number]["id"];