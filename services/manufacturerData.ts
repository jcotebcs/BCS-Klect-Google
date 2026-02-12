
export interface HistoricalSignatures {
  make: string;
  country: string;
  active: boolean;
  period: string;
  logoEvolution: string[];
  description: string;
  techContributions: string[];
  modelSpecificEmblems: { model: string; description: string }[];
  legacyModels?: string[];
}

export const NORTH_AMERICAN_ARCHIVES: HistoricalSignatures[] = [
  // --- UNITED STATES ---
  {
    make: "Abbott-Detroit",
    country: "USA",
    active: false,
    period: "1909–1918",
    logoEvolution: ["Ornate serif 'Abbott-Detroit' script", "Simplified 'Abbott' wordmark (post-1916)"],
    description: "A premier 'assembled car' manufacturer from Detroit that emphasized luxury and 'up-to-the-minute' reliability. Succumbed to capital strain after moving to Cleveland.",
    techContributions: ["Early adoption of Continental and Herschell-Spillman engines", "Advanced 8-cylinder implementation in 1916"],
    modelSpecificEmblems: [
      { model: "Battleship Roadster", description: "Minimalist aerodynamic hood ornament" }
    ],
    legacyModels: ["Model A", "Model 44", "Battleship Roadster", "Model 8-80"]
  },
  {
    make: "AC Propulsion",
    country: "USA",
    active: true,
    period: "1992–Present",
    logoEvolution: ["Modern blue/white stylized 'AC' within a circular orbital path"],
    description: "Pivotal electric vehicle (EV) pioneer. Created the tzero sports car which served as the foundational benchmark for the original Tesla Roadster.",
    techContributions: ["High-efficiency AC induction drive systems", "Integrated power electronics (PEM)"],
    modelSpecificEmblems: [
      { model: "tzero", description: "Hand-painted orbital signature on fiberglass/Kevlar panels" }
    ],
    legacyModels: ["tzero", "eBox"]
  },
  {
    make: "Adams-Farwell",
    country: "USA",
    active: false,
    period: "1905–1912",
    logoEvolution: ["Detailed heraldic badge with 'The Adams Company' outer ring"],
    description: "Engineering maverick known for the rotary combustion engine where cylinders rotated around a stationary crankshaft. Rear-engined pioneers.",
    techContributions: ["Rotary air-cooled engine (self-cooling)", "Rear-mounted powerplant integration"],
    modelSpecificEmblems: [
      { model: "Gentleman's Speed Roadster", description: "Brass-cast 'Farwell' signature plates" }
    ],
    legacyModels: ["Model No. 5", "Series 6", "Model 9"]
  },
  {
    make: "Ford",
    country: "USA",
    active: true,
    period: "1903-Present",
    logoEvolution: [
      "1903: Ornate black oval with 'Ford Motor Co. Detroit, Mich.'",
      "1912: Spread wings 'The Universal Car' branding",
      "1927: Debut of the iconic Blue Oval",
      "2003: Centenary Blue Oval with 3D gradient"
    ],
    description: "Revolutionized the industrial world with the moving assembly line. Transitioned from the Model T to global dominance in trucks and EVs.",
    techContributions: ["Moving assembly line", "First mass-market V8 (1932)", "Aluminum-intensive truck frames"],
    modelSpecificEmblems: [
      { model: "Mustang", description: "Galloping horse silhouette" },
      { model: "Thunderbird", description: "Stylized spread-wing bird emblem" },
      { model: "Mach-E", description: "Backlit electric stallion signature" }
    ],
    legacyModels: ["Model T", "Model A (1927)", "Fairlane", "Mustang", "F-150 Lightning"]
  },
  {
    make: "Dodge",
    country: "USA",
    active: true,
    period: "1914-Present",
    logoEvolution: [
      "1914: Interlocking DB circle",
      "1993: Ram Head shield",
      "2010: Twin slanted red stripes (Rhombus)"
    ],
    description: "Founded by the Dodge Brothers as a parts supplier. Renowned for rugged durability and, later, extreme muscle car performance.",
    techContributions: ["All-steel body construction pioneers", "Hemi combustion chamber technology"],
    modelSpecificEmblems: [
      { model: "Viper", description: "'Sneaky Pete' or 'Fangs' snake head profiles" },
      { model: "Hellcat", description: "Stylized feline head profile in chrome/satin" }
    ],
    legacyModels: ["Victory Six", "Charger", "Challenger", "Viper", "Durango"]
  },

  // --- CANADA ---
  {
    make: "Bricklin",
    country: "Canada",
    active: false,
    period: "1974-1975",
    logoEvolution: ["Minimalist horizontal badge with parallel-bar 'SV-1' lettering"],
    description: "Indigenous Canadian sports car venture. Focused on safety with integrated roll cages and composite bodies. Only 3,000 units produced.",
    techContributions: ["Composite acrylic bodywork", "Hydraulic gull-wing doors"],
    modelSpecificEmblems: [
      { model: "SV-1", description: "Black rectangular badge with silver parallel characters" }
    ],
    legacyModels: ["SV-1"]
  },
  {
    make: "Acadian",
    country: "Canada",
    active: false,
    period: "1962–1971",
    logoEvolution: ["Split grille badge with stylized 'A' and maple leaf motifs"],
    description: "A GM Canada brand created for Pontiac-Buick dealers to sell a compact car without import duties. Based on Chevy II architecture.",
    techContributions: ["Regional badge engineering optimization", "Canadian-specific dealer network tailoring"],
    modelSpecificEmblems: [
      { model: "Canso", description: "Deluxe trim script with maple leaf accents" }
    ],
    legacyModels: ["Invader", "Canso", "Beaumont"]
  },

  // --- MEXICO ---
  {
    make: "Mastretta",
    country: "Mexico",
    active: true,
    period: "1987-Present",
    logoEvolution: ["Shield with Mexican flag colors and checkered flag motif"],
    description: "Producer of the MXT, Mexico's first mass-produced sports car. Focused on lightweight performance and bonded aluminum chassis.",
    techContributions: ["Bonded aluminum chassis technology", "Specialized kit car scaling"],
    modelSpecificEmblems: [
      { model: "MXT", description: "Circular racing-inspired badges" }
    ],
    legacyModels: ["MXB", "MXT"]
  },
  {
    make: "VUHL",
    country: "Mexico",
    active: true,
    period: "2013–Present",
    logoEvolution: ["Minimalist bold 'VUHL' wordmark in high-contrast monochrome"],
    description: "Boutique manufacturer of ultra-high-performance track-legal cars. Utilizes aerospace-grade materials.",
    techContributions: ["Aerospace aluminum honeycomb chassis", "High-stress carbon fiber integration"],
    modelSpecificEmblems: [
      { model: "05", description: "Numbered limited edition plaques" }
    ],
    legacyModels: ["05", "05RR"]
  }
];

export function queryArchives(query: string): HistoricalSignatures | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  return NORTH_AMERICAN_ARCHIVES.find(a => 
    a.make.toLowerCase().includes(q) || 
    a.country.toLowerCase() === q ||
    a.description.toLowerCase().includes(q) ||
    a.legacyModels?.some(m => m.toLowerCase().includes(q)) ||
    a.modelSpecificEmblems.some(e => e.model.toLowerCase().includes(q))
  ) || null;
}
