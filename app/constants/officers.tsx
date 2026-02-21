import { 
  FaStar, 
  FaPaintBrush, 
  FaCamera, 
  FaVideo, 
  FaPen 
} from "react-icons/fa";

// --- 1. EXECUTIVE OFFICERS ---
export const OFFICERS = [
  {
    id: 1,
    name: "Justine Lloyd Garma",
    role: "President",
    bio: "Leading the vision for JPCS with a passion for innovation and community building. Focused on creating impactful workshops this year.",
    image: "/officers/PR.JPG", 
    socials: { facebook: "https://www.facebook.com/justine.lloyd.garma#", email: "justine.garma@dlsau.edu.ph" }
  },
  {
    id: 2,
    name: "Ice Matthew Ramirez",
    role: "Vice President - Operations",
    bio: "Ensuring smooth operations within the organization and managing member engagement. A backend development enthusiast.",
    image: "/officers/VPO.JPG",
    socials: { facebook: "https://www.facebook.com/icyy.teo/", email: "ice.ramirez@dlsau.edu.ph" }
  },
  {
    id: 3,
    name: "Louievince Kyle Laguidao" ,
    role: "Vice President - External",
    bio: "Building bridges with other organizations and industry partners. Expert in networking and corporate relations.",
    image: "/officers/VPE.JPG",
    socials: { facebook: "https://www.facebook.com/luwi.111093", email: "louievince.laguidao@dlsau.edu.ph" }
  },
  {
    id: 4,
    name: "Ashley Krishan Navarro",
    role: "Vice President - Internal",
    bio: "Ensuring Internal Operations are fluid and are optimized for efficiency.",
    image: "/officers/VPI.JPG",
    socials: { facebook: "https://www.facebook.com/hnchkrshn#", email: "ashley.navarro@dlsau.edu.ph" }
  },
  {
    id: 5,
    name: "Reynalyn Ruth Morbo",
    role: "Secretary",
    bio: "Keeping the organization organized and on track with meticulous record-keeping and scheduling.",
    image: "/officers/SEC.JPG",
    socials: { facebook: "https://www.facebook.com/reynalyn.morbo", email: "reynalyn.morbo@dlsau.edu.ph" }
  },
  {
    id: 7,
    name: "Shelley Kellzie Chua",
    role: "Treasurer",
    bio: "Managing the organization's finances with transparency and accountability, ensuring funds are allocated effectively.",
    image: "/officers/TREAS.JPG",
    socials: { facebook: "https://www.facebook.com/shelleyk.chua#", email: "shelley.chua@dlsau.edu.ph" }
  },
  {
    id: 8,
    name: "Cyril Rodriguez",
    role: "Auditor",
    bio: "Keeping the organization organized and on track with meticulous record-keeping and scheduling.",
    image: "/officers/AUD.JPG",
    socials: { facebook: "https://www.facebook.com/rodricyr", email: "cyril.rodriguez@dlsau.edu.ph" }
  },
];

// --- 2. EXECUTIVE ASSOCIATES ---
export const EXECUTIVES = [
  { 
    name: "Joshua Enriquez", 
    role: "Assistant Secretary", 
    icon: <FaStar />,
    image: "/officers/ASEC.JPG" 
  },
];

// --- 3. YEAR REPRESENTATIVES ---
export const YEAR_REPS = [
  { 
    id: 1,
    year: "1st Year",
    number: "01",
    name: "Bernadette Basco", 
    image: "/officers/YR1.png", 
    quote: "The voice of the fresh minds."
  },
  { 
    id: 2,
    year: "2nd Year",
    number: "02",
    name: "Carlos Alcantara", 
    image: "/officers/YR2.png", 
    quote: "Bridging the gap for sophomores."
  },
  { 
    id: 3,
    year: "3rd Year",
    number: "03",
    name: "Synellign Bautista", 
    image: "/officers/REP3.JPG", 
    quote: "Guiding the juniors to excellence."
  },
];

// --- 4. COMMITTEES ---

export const GRAPHIC_DESIGNERS = [
  { 
    name: "Jhenelle Fern Refuerzo", 
    role: "Graphic Designer", 
    icon: <FaPaintBrush />,
    image: "/creatives/GA1.JPG"
  },
  { 
    name: "Chelsy Mei Tuazon", 
    role: "Graphic Designer", 
    icon: <FaPaintBrush />,
    image: "/creatives/GA2.JPG"
  },
  { 
    name: "Marcelino III Zapanta", 
    role: "Graphic Designer", 
    icon: <FaPaintBrush />,
    image: "/creatives/GA3.jpg"
  },
  { 
    name: "Ashley Krishan Navarro", 
    role: "Graphic Designer", 
    icon: <FaPaintBrush />,
    image: "/creatives/GA4.JPG"
  },
];

export const MEDIA_TEAM = [
  { 
    name: "Joshua Enriquez", 
    role: "Photographer", 
    icon: <FaCamera />,
    image: "/creatives/PH1.png"
  },
  { 
    name: "Jose Luis Gabo", 
    role: "Photographer", 
    icon: <FaCamera />,
    image: "/creatives/PH3.png"
  },
  { 
    name: "Carlos Alcantara", 
    role: "Video Editor", 
    icon: <FaVideo />,
    image: "/creatives/VE.JPG"
  },
];

export const CONTENT_TEAM = [
  { 
    name: "Manuel Zian Kyle Piangco", 
    role: "Captions / Writer", 
    icon: <FaPen />,
    image: "/creatives/CAP.JPG"
  },
  {
    name: "Shelley Kellzie Chua",
    role: "Captions / Content",
    icon: <FaPen />,
    image: "/creatives/CAP3.JPG"
  },
];