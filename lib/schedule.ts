// lib/schedule.ts
export const SEMINAR_SCHEDULE = [
  {
    id: "aller-genius",
    title: "Aller-Genius: New Frontiers in Veterinary Allergy Care",
    speaker: "Criselda C. Lao, DVM, RN, MAN, USRN, FelPCCP, FelPCVS-CA",
    startTime: "08:00",
    endTime: "09:00",
  },
  {
    id: "photobiomodulation",
    title: "Use of Photobiomodulation Therapy in Chronic Kidney Disease Cases",
    speaker: "Ken Anthony L. Lao, DVM, FelPCCP, FelPCVS-CA",
    startTime: "09:00",
    endTime: "10:00",
  },
  {
    id: "emergency-topic",
    title: "Emergency Topic",
    speaker: "Nikki & Joshua Sy",
    startTime: "10:00",
    endTime: "11:00",
  },
  {
    id: "nutrition-surgery",
    title: "Nutrition in Surgery",
    speaker: "Everlyn Austria",
    startTime: "11:00",
    endTime: "12:00",
  },
];

export function getCurrentSeminar() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return SEMINAR_SCHEDULE.find(s => currentTime >= s.startTime && currentTime < s.endTime) ?? null;
}