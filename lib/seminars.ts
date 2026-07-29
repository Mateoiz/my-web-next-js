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

const VALID_SEMINAR_IDS = new Set<string>(SEMINAR_OPTIONS.map(s => s.id));

/**
 * Returns true if `id` is a real, currently-known seminar ID. Useful for
 * filtering out stale IDs from old registrations after a seminar gets
 * renamed/removed from SEMINAR_OPTIONS.
 */
export function isValidSeminarId(id: unknown): id is SeminarId {
  return typeof id === "string" && VALID_SEMINAR_IDS.has(id);
}

/**
 * Normalizes a registration doc's `seminars` field into a clean array of
 * valid ID strings, regardless of which shape it was written in:
 *
 *  - Current shape:  ["lao-c-aller-genius", "sy-emergency"]
 *  - Legacy shape:    [{ id: "lao-c-aller-genius", title: "...", ... }, ...]
 *    (this was the pre-fix bug where the register page stored full Seminar
 *    objects instead of IDs, which silently broke `.includes(id)` checks
 *    on the scanner)
 *
 * Anything that isn't a string or an object with a valid `.id` is dropped.
 * Always returns a fresh array — never mutates the input.
 */
export function getRegisteredSeminarIds(raw: unknown): SeminarId[] {
  if (!Array.isArray(raw)) return [];

  const ids = raw
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object" && typeof (entry as any).id === "string") {
        return (entry as any).id;
      }
      return null;
    })
    .filter((id): id is string => isValidSeminarId(id));

  // De-dupe in case legacy + fixed writes ever overlapped on the same doc.
  return Array.from(new Set(ids));
}

/**
 * Looks up full Seminar objects (title, speaker, programs) for a set of
 * registered IDs — for UI that needs to display what someone signed up
 * for, not just the raw ID list.
 */
export function getSeminarsByIds(ids: string[]): Seminar[] {
  return SEMINAR_OPTIONS.filter(s => ids.includes(s.id));
}