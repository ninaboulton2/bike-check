import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, bikes, components } from "@bike-check/db";
import { eq, and } from "drizzle-orm";
import { getComponentStatus } from "@bike-check/core";

/** GET /api/dashboard — aggregated dashboard data */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userBikes = await db
    .select()
    .from(bikes)
    .where(and(eq(bikes.userId, session.userId), eq(bikes.isActive, true)));

  const result = await Promise.all(
    userBikes.map(async (bike) => {
      const bikeComponents = await db
        .select()
        .from(components)
        .where(
          and(eq(components.bikeId, bike.id), eq(components.status, "active")),
        );

      const componentStatuses = bikeComponents.map((comp) => {
        const status = getComponentStatus({
          currentDistanceKm: parseFloat(comp.currentDistanceKm),
          currentHours: parseFloat(comp.currentHours),
          installDate: comp.installDate,
          thresholdDistanceKm: comp.thresholdDistanceKm
            ? parseFloat(comp.thresholdDistanceKm)
            : null,
          thresholdHours: comp.thresholdHours
            ? parseFloat(comp.thresholdHours)
            : null,
          thresholdDays: comp.thresholdDays,
        });

        return {
          ...comp,
          status: status,
        };
      });

      // Sort: critical/overdue first, then by percent used descending
      const levelOrder = { overdue: 0, critical: 1, warning: 2, approaching: 3, good: 4 };
      componentStatuses.sort(
        (a, b) =>
          (levelOrder[a.status.level] ?? 5) - (levelOrder[b.status.level] ?? 5) ||
          b.status.percentUsed - a.status.percentUsed,
      );

      return {
        bike,
        components: componentStatuses,
        attentionCount: componentStatuses.filter(
          (c) =>
            c.status.level === "warning" ||
            c.status.level === "critical" ||
            c.status.level === "overdue",
        ).length,
      };
    }),
  );

  return NextResponse.json(result);
}
