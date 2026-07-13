// lib/seminars.ts
// Single source of truth for CVMAS Week programs + seminars.
// The registration form, scanner, self-checkout, and admin dashboard all
// import from here so a seminar added/edited in one place is correct
// everywhere, with consistent program scoping and IDs.

export const PROG_DVM = "Doctor of Veterinary Medicine";
export const PROG_AGRI = "Bachelor of Science in Agriculture";
export const PROG_FT = "Bachelor of Science in Food Technology";

export const PROGRAM_OPTIONS = [PROG_DVM, PROG_AGRI, PROG_FT];

// Short labels used for compact UI (tabs, badges) where the full program
// name would be too long.
export const PROGRAM_SHORT_LABEL: Record<string, string> = {
  [PROG_DVM]: "DVM",
  [PROG_AGRI]: "Agriculture",
  [PROG_FT]: "Food Tech",
};

const DVM_AGRI = [PROG_DVM, PROG_AGRI];

export interface Seminar {
  id: string;
  title: string;
  speaker: string;
  programs: string[];
}

export const SEMINAR_OPTIONS: Seminar[] = [
  {
    id: "lao-c-aller-genius",
    title: "Aller-Genius: New Frontiers in Veterinary Allergy Care",
    speaker: "Criselda C. Lao, DVM, RN, MAN, USRN, FelPCCP, FelPCVS-CA",
    programs: DVM_AGRI,
  },
  {
    id: "lao-k-photobiomodulation",
    title: "Use of Photobiomodulation Therapy in Chronic Kidney Disease Cases in the Philippines: A Pilot Study",
    speaker: "Ken Anthony L. Lao, DVM, FelPCCP, FelPCVS-CA",
    programs: DVM_AGRI,
  },
  {
    id: "sy-emergency",
    title: "Emergency Topic",
    speaker: "Nikki & Joshua Sy",
    programs: DVM_AGRI,
  },
  {
    id: "austria-nutrition-surgery",
    title: "Nutrition in Surgery",
    speaker: "Everlyn Austria",
    programs: DVM_AGRI,
  },
  {
    id: "dela-cruz-source",
    title: "From Source to Safety: The importance of water microbiology in public health and food system",
    speaker: "Dr. Emeliza Laurenciana, MBA",
    programs: [PROG_FT],
  },
];

export type SeminarId = typeof SEMINAR_OPTIONS[number]["id"];