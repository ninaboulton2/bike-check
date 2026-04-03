import { NextRequest, NextResponse } from "next/server";
import { db, users, bikes, components } from "@bike-check/db";
import { eq, and } from "drizzle-orm";
import { getComponentStatus } from "@bike-check/core";

/**
 * GET /api/cron/daily-check
 *
 * Secured with CRON_SECRET header. Scans all active users' components for
 * threshold crossings. Does NOT send emails yet (Phase 4) — just identifies
 * which components need attention and returns a summary.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all active users
  const allUsers = await db.select({ id: users.id }).from(users);

  const alerts: Array<{
    userId: string;
    bikeId: string;
    bikeName: string;
    componentId: string;
    componentName: string;
    componentType: string;
    level: string;
    percentUsed: number;
    reason: string;
  }> = [];

  for (const user of allUsers) {
    // Get user's active bikes
    const userBikes = await db
      .select()
      .from(bikes)
      .where(and(eq(bikes.userId, user.id), eq(bikes.isActive, true)));

    for (const bike of userBikes) {
      // Get active components
      const bikeComponents = await db
        .select()
        .from(components)
        .where(
          and(eq(components.bikeId, bike.id), eq(components.status, "active")),
        );

      for (const comp of bikeComponents) {
        // --- Calendar-based components (threshold_days) ---
        if (comp.thresholdDays && comp.thresholdDays > 0) {
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

          if (
            status.level === "warning" ||
            status.level === "critical" ||
            status.level === "overdue"
          ) {
            const installMs = new Date(comp.installDate).getTime();
            const daysSinceInstall = Math.floor(
              (Date.now() - installMs) / (1000 * 60 * 60 * 24),
            );

            alerts.push({
              userId: user.id,
              bikeId: bike.id,
              bikeName: bike.name,
              componentId: comp.id,
              componentName: comp.name,
              componentType: comp.type,
              level: status.level,
              percentUsed: status.percentUsed,
              reason: `calendar: ${daysSinceInstall}/${comp.thresholdDays} days`,
            });
          }
        }

        // --- Care-tracking components ---
        if (comp.careTracking) {
          let careOverdue = false;
          let reason = "";

          if (comp.careIntervalKm && parseFloat(comp.careIntervalKm) > 0) {
            const kmSinceCare =
              parseFloat(comp.currentDistanceKm) -
              parseFloat(comp.lastCareKm);
            if (kmSinceCare >= parseFloat(comp.careIntervalKm)) {
              careOverdue = true;
              reason = `care: ${kmSinceCare.toFixed(0)} km since last care (interval: ${comp.careIntervalKm} km)`;
            }
          }

          if (
            !careOverdue &&
            comp.careIntervalHours &&
            parseFloat(comp.careIntervalHours) > 0
          ) {
            const hrsSinceCare =
              parseFloat(comp.currentHours) -
              parseFloat(comp.lastCareHours);
            if (hrsSinceCare >= parseFloat(comp.careIntervalHours)) {
              careOverdue = true;
              reason = `care: ${hrsSinceCare.toFixed(1)} hrs since last care (interval: ${comp.careIntervalHours} hrs)`;
            }
          }

          if (careOverdue) {
            alerts.push({
              userId: user.id,
              bikeId: bike.id,
              bikeName: bike.name,
              componentId: comp.id,
              componentName: comp.name,
              componentType: comp.type,
              level: "overdue",
              percentUsed: 100,
              reason,
            });
          }
        }

        // --- Battery-tracking components ---
        if (comp.batteryTracking && comp.batteryLifeHours) {
          const batteryLife = parseFloat(comp.batteryLifeHours);
          if (batteryLife > 0) {
            // currentHours tracks total usage; we compare against battery life
            // Battery hours are reset on charge, so currentHours minus last
            // charge point represents hours since charge. For simplicity we
            // use the component's currentHours as the battery counter (it's
            // reset when the user marks a charge via the care/charge action).
            const hoursUsed = parseFloat(comp.currentHours);
            if (hoursUsed >= batteryLife) {
              alerts.push({
                userId: user.id,
                bikeId: bike.id,
                bikeName: bike.name,
                componentId: comp.id,
                componentName: comp.name,
                componentType: comp.type,
                level: "overdue",
                percentUsed: (hoursUsed / batteryLife) * 100,
                reason: `battery: ${hoursUsed.toFixed(1)}/${batteryLife} hours`,
              });
            }
          }
        }

        // --- Distance/hours threshold components (general wear) ---
        if (
          !comp.thresholdDays &&
          !comp.careTracking &&
          !comp.batteryTracking
        ) {
          const thresholdKm = comp.thresholdDistanceKm
            ? parseFloat(comp.thresholdDistanceKm)
            : null;
          const thresholdHrs = comp.thresholdHours
            ? parseFloat(comp.thresholdHours)
            : null;

          if (thresholdKm || thresholdHrs) {
            const status = getComponentStatus({
              currentDistanceKm: parseFloat(comp.currentDistanceKm),
              currentHours: parseFloat(comp.currentHours),
              installDate: comp.installDate,
              thresholdDistanceKm: thresholdKm,
              thresholdHours: thresholdHrs,
              thresholdDays: null,
            });

            if (
              status.level === "warning" ||
              status.level === "critical" ||
              status.level === "overdue"
            ) {
              alerts.push({
                userId: user.id,
                bikeId: bike.id,
                bikeName: bike.name,
                componentId: comp.id,
                componentName: comp.name,
                componentType: comp.type,
                level: status.level,
                percentUsed: status.percentUsed,
                reason: thresholdKm
                  ? `wear: ${parseFloat(comp.currentDistanceKm).toFixed(0)}/${thresholdKm} km`
                  : `wear: ${parseFloat(comp.currentHours).toFixed(1)}/${thresholdHrs} hrs`,
              });
            }
          }
        }
      }
    }
  }

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    usersChecked: allUsers.length,
    alertsFound: alerts.length,
    alerts,
  });
}
