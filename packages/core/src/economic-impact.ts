// ---------------------------------------------------------------------------
// Component relationships & economic impact messaging
// ---------------------------------------------------------------------------

/**
 * Maps a primary component type to the dependent components it can damage
 * when worn beyond its service life.
 */
export const COMPONENT_RELATIONSHIPS: Record<string, string[]> = {
  chain: ["cassette", "chainrings"],
  cassette: ["chainrings"],
  front_brake_pads: ["brake_rotor_front"],
  rear_brake_pads: ["brake_rotor_rear"],
};

// ---------------------------------------------------------------------------
// getEconomicImpactMessage
// ---------------------------------------------------------------------------

export function getEconomicImpactMessage(params: {
  componentType: string;
  level: string;
  costCents?: number | null;
  relatedComponents?: { type: string; costCents?: number | null }[];
}): string {
  const { componentType, level, relatedComponents } = params;

  const dependents = COMPONENT_RELATIONSHIPS[componentType];

  // No known relationships — generic message
  if (!dependents || dependents.length === 0) {
    return "This component is approaching its replacement threshold";
  }

  // Helper: find a related component's cost by type
  const findRelatedCost = (type: string): number | null => {
    const match = relatedComponents?.find((c) => c.type === type);
    return match?.costCents != null ? match.costCents : null;
  };

  // Helper: format cents as a plain number string (no currency symbol)
  const formatCost = (cents: number): string => {
    const dollars = cents / 100;
    return dollars % 1 === 0 ? String(dollars) : dollars.toFixed(2);
  };

  // --- Chain ---
  if (componentType === "chain") {
    if (level === "overdue") {
      return "Your chain may be damaging your cassette and chainrings";
    }

    // warning or critical
    const cassetteCost = findRelatedCost("cassette");
    const base = "Replace your chain on time to protect your cassette";
    if (cassetteCost != null) {
      return `${base} (worth ~${formatCost(cassetteCost)})`;
    }
    return base;
  }

  // --- Cassette ---
  if (componentType === "cassette") {
    if (level === "overdue") {
      return "A worn cassette accelerates chainring wear";
    }

    const chainringCost = findRelatedCost("chainrings");
    const base =
      "Replace your cassette on time to protect your chainrings";
    if (chainringCost != null) {
      return `${base} (worth ~${formatCost(chainringCost)})`;
    }
    return base;
  }

  // --- Brake pads ---
  if (
    componentType === "front_brake_pads" ||
    componentType === "rear_brake_pads"
  ) {
    const rotorType =
      componentType === "front_brake_pads"
        ? "brake_rotor_front"
        : "brake_rotor_rear";

    if (level === "overdue") {
      return "Worn pads can damage your brake rotor";
    }

    const rotorCost = findRelatedCost(rotorType);
    const base = "Replace your brake pads on time to protect your brake rotor";
    if (rotorCost != null) {
      return `${base} (worth ~${formatCost(rotorCost)})`;
    }
    return base;
  }

  // Fallback (shouldn't be reached if COMPONENT_RELATIONSHIPS is exhaustive)
  return "This component is approaching its replacement threshold";
}
