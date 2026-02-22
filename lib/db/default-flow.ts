/** Default "Leads" flow and 7 stages created for each new agent when they have no flows. */
export const DEFAULT_FLOW_NAME = "Leads"
export const DEFAULT_STAGES = [
  { name: "New", order: 0, colorKey: "#EF4444" },
  { name: "Contacted", order: 1, colorKey: "#3B82F6" },
  { name: "Scheduled", order: 2, colorKey: "#A855F7" },
  { name: "No-Show", order: 3, colorKey: "#06B6D4" },
  { name: "Nurture", order: 4, colorKey: "#EAB308" },
  { name: "Converted", order: 5, colorKey: "#22C55E" },
  { name: "Closed-Lost", order: 6, colorKey: "#374151" },
] as const
