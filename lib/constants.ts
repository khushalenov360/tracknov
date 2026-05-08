export const categoryMeta = {
  EDA: { label: "Eco Design Approach", color: "bg-[var(--color-blue-light)] text-[var(--color-blue)] border-[var(--color-blue-light)]", dot: "bg-[var(--color-blue)]" },
  WC: { label: "Water Conservation", color: "bg-[var(--color-green-light)] text-[var(--color-green)] border-[var(--color-green-light)]", dot: "bg-[var(--color-green)]" },
  EE: { label: "Energy Efficiency", color: "bg-[var(--color-amber-light)] text-[var(--color-amber)] border-[var(--color-amber-light)]", dot: "bg-[var(--color-amber)]" },
  IM: { label: "Interior Materials", color: "bg-[var(--color-purple-light)] text-[var(--color-purple)] border-[var(--color-purple-light)]", dot: "bg-[var(--color-purple)]" },
  IE: { label: "Indoor Environment", color: "bg-[var(--color-red-light)] text-[var(--color-red)] border-[var(--color-red-light)]", dot: "bg-[var(--color-red)]" },
  IID: { label: "Innovation", color: "bg-[var(--color-olive-light)] text-[var(--color-olive)] border-[var(--color-olive-light)]", dot: "bg-[var(--color-olive)]" },
} as const;

export const documentStatuses = {
  uploaded: {
    label: "Pending Project Owner Review",
    enovaitLabel: "Owner Review",
    className: "border border-[var(--color-amber-light)] bg-[var(--color-amber-light)] text-[var(--color-amber)]",
  },
  owner_approved: {
    label: "Pending Project Admin Review",
    enovaitLabel: "Admin Review",
    className: "border border-[var(--color-blue-light)] bg-[var(--color-blue-light)] text-[var(--color-blue)]",
  },
  approved: {
    label: "Approved For Submission",
    enovaitLabel: "Included",
    className: "border border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[var(--color-green)]",
  },
  rejected: {
    label: "Rejected",
    enovaitLabel: "Rejected",
    className: "border border-[var(--color-red-light)] bg-[var(--color-red-light)] text-[var(--color-red)]",
  },
} as const;

export const projectStatuses = {
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  archived: "Archived",
} as const;

export const projectTypes = {
  residential: "Residential",
  commercial: "Commercial",
  industrial: "Industrial",
  infrastructure: "Infrastructure",
  mixed_use: "Mixed Use",
} as const;

export const igbcRatingSystemGroups = [
  {
    label: "IGBC Green Residential",
    systems: [
      "IGBC Green Homes",
      "IGBC Green Residential Societies",
      "IGBC Green Affordable Housing",
      "IGBC NEST",
    ],
  },
  {
    label: "IGBC Green Commercial",
    systems: [
      "IGBC Green New Buildings",
      "IGBC Green Existing Buildings",
      "IGBC Green Interiors",
      "IGBC Green Healthcare",
      "IGBC Health and Well-being",
      "IGBC Green Service Buildings",
      "IGBC Green Resorts",
      "IGBC Green Hotels",
    ],
  },
  {
    label: "IGBC Green Industrial",
    systems: [
      "IGBC Green Factory Buildings",
      "IGBC Green Logistics Parks and Warehouses",
    ],
  },
  {
    label: "IGBC Green Data Centers",
    systems: [
      "IGBC Green Data Center",
      "Data Centres",
    ],
  },
  {
    label: "IGBC Green Built Environment",
    systems: [
      "IGBC Green Townships",
      "IGBC Green Cities",
      "IGBC Green Existing Cities",
      "IGBC Green Hill Habitat",
      "IGBC Green Mass Rapid Transit System",
      "IGBC Green Existing Mass Rapid Transit System",
      "IGBC Green Railway Stations",
      "IGBC Green High Speed Rail",
      "IGBC Green Landscapes",
      "IGBC Green Villages",
    ],
  },
  {
    label: "IGBC Net Zero",
    systems: [
      "IGBC Net Zero Energy Rating System",
      "IGBC Net Zero Water Rating System",
      "IGBC Net Zero Water Buildings",
      "IGBC Net Zero Waste to Landfill Rating System",
      "IGBC Net Zero Waste Rating System",
      "IGBC Net Zero Carbon Rating System",
      "IGBC Net Zero Carbon Guidelines",
    ],
  },
  {
    label: "Other Building Typologies",
    systems: [
      "IGBC Green Schools",
      "IGBC Green Campus",
      "IGBC Green Place of Worship",
    ],
  },
] as const;

export const igbcRatingSystems = igbcRatingSystemGroups.flatMap((group) => group.systems);

export const creditStatuses = {
  pending: "border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]",
  in_progress: "border border-[var(--color-blue-light)] bg-[var(--color-blue-light)] text-[var(--color-blue)]",
  blocked: "border border-[var(--color-red-light)] bg-[var(--color-red-light)] text-[var(--color-red)]",
  complete: "border border-[var(--color-green-light)] bg-[var(--color-green-light)] text-[var(--color-green)]",
} as const;

export const roleLabels = {
  super_user: "Super User",
  l4_reserved: "L4 (Reserved)",
  owner: "Project Owner",
  client: "Client",
  consultant: "Consultant",
  architect: "Architect",
  mep: "MEP Consultant",
  contractor: "Contractor",
  project_admin: "Project Admin",
  super_admin: "Super Admin",
} as const;
