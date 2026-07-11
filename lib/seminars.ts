export interface Seminar {
  id: string;
  title: string;
  speaker: string;
}

export const SEMINAR_OPTIONS: Seminar[] = [
  {
    id: "aller-genius",
    title: "Aller-Genius: New Frontiers in Veterinary Allergy Care",
    speaker: "Criselda C. Lao, DVM, RN, MAN, USRN, FelPCCP, FelPCVS-CA",
  },
  {
    id: "photobiomodulation",
    title: "Use of Photobiomodulation Therapy in Chronic Kidney Disease Cases in the Philippines: A Pilot Study",
    speaker: "Ken Anthony L. Lao, DVM, FelPCCP, FelPCVS-CA",
  },
  {
    id: "emergency-topic",
    title: "Emergency Topic",
    speaker: "Nikki & Joshua Sy",
  },
  {
    id: "nutrition-surgery",
    title: "Nutrition in Surgery",
    speaker: "Everlyn Austria",
  },
];

export type SeminarId = typeof SEMINAR_OPTIONS[number]["id"];