"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Bike, Droplets, Loader2, Search, Wrench, ArrowRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/use-translation";
import {
  ComponentCard,
  type DashboardComponent,
} from "@/components/component-card";
import { useCurrency } from "@/lib/use-currency";

interface DashboardBike {
  bike: { id: string; name: string; type: string };
  components: DashboardComponent[];
  attentionCount: number;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardBike[]>([]);
  const [loading, setLoading] = useState(true);
  const [replacing, setReplacing] = useState<string | null>(null);
  // bikeId that is still syncing its Strava history in the background (initial creation)
  const [syncingBikeId, setSyncingBikeId] = useState<string | null>(null);
  // True while the dashboard sync + recalculate chain is running
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>("status");
  const [careAlert, setCareAlert] = useState<string | null>(null);
  const [careAlertDismissed, setCareAlertDismissed] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currency = useCurrency();

  useEffect(() => {
    // If a trainer was just created, note its id so we can exclude it from
    // the normal recalculate cycle — only the polling (below) may clear it.
    const syncing = searchParams.get("syncing") ?? null;
    if (syncing) {
      setSyncingBikeId(syncing);
      startPolling(syncing);
    }

    // Sync rides from Strava first, then load dashboard.
    // Pass the syncing bike id so it is excluded from the routine recalculate
    // (its km must only appear once the full historical sync is complete).
    syncThenFetch(syncing);

    return () => stopPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startPolling(bikeId: string) {
    const syncKey = `trainer_syncing_${bikeId}`;
    stopPolling();
    pollRef.current = setInterval(async () => {
      const status = localStorage.getItem(syncKey);
      if (status === "done") {
        localStorage.removeItem(syncKey);
        stopPolling();
        setSyncingBikeId(null);
        await fetchDashboard(true);
        router.replace("/dashboard");
      }
    }, 2000);

    // Safety timeout — give up after 3 minutes and just show what we have
    pollTimeoutRef.current = setTimeout(() => {
      localStorage.removeItem(syncKey);
      stopPolling();
      setSyncingBikeId(null);
      router.replace("/dashboard");
    }, 3 * 60 * 1000);
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (pollTimeoutRef.current) { clearTimeout(pollTimeoutRef.current); pollTimeoutRef.current = null; }
  }

  async function syncThenFetch(excludeBikeId: string | null = null) {
    // Load dashboard immediately with whatever data exists
    await fetchDashboard();

    // If a bike is currently syncing (initial creation or linked-bike change),
    // skip the dashboard's own sync to avoid a race condition where two syncs
    // process the same rides concurrently and cause double-counted kms.
    // The background chain (from the dialog) handles sync + recalculate.
    if (excludeBikeId) return;

    // Fire sync in background — corrects isIndoor flags and adds new rides
    setSyncing(true);
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(async () => {
        // After sync, recalculate trainer bikes only. Trainer hardware km
        // are rebuilt from indoor ride logs (absolute). Outdoor bikes don't
        // need recalculating — their base is from Strava + incremental sync.
        const latestData = await fetchDashboard(true);
        const trainerIds = (latestData ?? [])
          .filter((d) => d.bike.type === "trainer")
          .map((d) => d.bike.id);
        if (trainerIds.length === 0) return;
        await Promise.all(
          trainerIds.map((id) =>
            fetch(`/api/bikes/${id}/recalculate`, { method: "POST" }),
          ),
        );
        await fetchDashboard(true);
      })
      .then(async () => {
        // Check last ride conditions for care alerts
        try {
          const ridesRes = await fetch("/api/rides?limit=1");
          const rides = await ridesRes.json();
          if (rides.length > 0 && rides[0].conditions && rides[0].conditions !== "dry") {
            setCareAlert(rides[0].conditions);
          }
        } catch { /* ignore */ }
      })
      .catch(() => fetchDashboard())
      .finally(() => setSyncing(false));
  }

  /** Fetches dashboard data. Pass `silent=true` to skip the loading state.
   *  Returns the raw JSON so callers can inspect it. */
  async function fetchDashboard(silent = false): Promise<DashboardBike[] | null> {
    const dashRes = await fetch("/api/dashboard");
    if (dashRes.status === 401) {
      router.push("/");
      return null;
    }
    const json: DashboardBike[] = await dashRes.json();
    setData(json);
    if (!silent) setLoading(false);
    return json;
  }

  async function handleReplace(
    componentId: string,
    opts: { date: string; costCents?: number; notes?: string }
  ) {
    setReplacing(componentId);
    try {
      await fetch(`/api/components/${componentId}/replace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "replaced",
          date: opts.date,
          costCents: opts.costCents,
          notes: opts.notes,
        }),
      });
      await fetchDashboard();
    } finally {
      setReplacing(null);
    }
  }

  async function handleEditComponent(
    componentId: string,
    updates: Record<string, unknown>
  ) {
    await fetch(`/api/components/${componentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    await fetchDashboard();
  }

  async function handleRemoveComponent(componentId: string) {
    await fetch(`/api/components/${componentId}`, { method: "DELETE" });
    await fetchDashboard();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Bike className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-6 text-xl font-semibold">{t("dashboard.noBikes")}</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {t("dashboard.noBikesDescription")}
        </p>
        <Link href="/onboarding" className={buttonVariants({ className: "mt-6 gap-1.5" })}>
            Set up your bikes
            <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    );
  }

  // Summary stats across all bikes
  const totalComponents = data.reduce((s, d) => s + d.components.length, 0);
  const totalAttention = data.reduce((s, d) => s + d.attentionCount, 0);
  const totalKm = data.reduce(
    (s, d) =>
      s +
      d.components.reduce(
        (cs, c) => Math.max(cs, Number(c.currentDistanceKm) || 0),
        0
      ),
    0
  );

  const showTabs = data.length > 1;

  const q = search.trim().toLowerCase();
  const STATUS_ORDER: Record<string, number> = { overdue: 0, critical: 1, warning: 2, approaching: 3, good: 4 };

  function sortComponents(a: DashboardComponent, b: DashboardComponent): number {
    switch (sortBy) {
      case "name": return t("components.labels." + a.type).localeCompare(t("components.labels." + b.type));
      case "km": return Number(b.currentDistanceKm) - Number(a.currentDistanceKm);
      case "installDate": return (a.installDate ?? "").localeCompare(b.installDate ?? "");
      default: return (STATUS_ORDER[a.status.level] ?? 5) - (STATUS_ORDER[b.status.level] ?? 5);
    }
  }

  function matchesFilter(comp: DashboardComponent): boolean {
    // Text search
    if (q) {
      const label = (t("components.labels." + comp.type) ?? "").toLowerCase();
      const matches =
        label.includes(q) ||
        comp.name.toLowerCase().includes(q) ||
        comp.type.toLowerCase().includes(q) ||
        (comp.brand?.toLowerCase().includes(q) ?? false) ||
        (comp.model?.toLowerCase().includes(q) ?? false);
      if (!matches) return false;
    }
    // Status filter (multi-select)
    if (statusFilters.size === 0) return true;
    return statusFilters.has(comp.status.level);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.subtitle")}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Bike className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold tabular-nums">
                  {Math.round(totalKm).toLocaleString()}
                </p>
                {(syncingBikeId || syncing) && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t("dashboard.kmTracked")}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Wrench className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {totalComponents}
              </p>
              <p className="text-xs text-muted-foreground">{t("dashboard.components")}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-1">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                totalAttention > 0 ? "bg-red-500/10" : "bg-emerald-500/10"
              }`}
            >
              <AlertTriangle
                className={`h-5 w-5 ${
                  totalAttention > 0
                    ? "text-red-500"
                    : "text-emerald-500"
                }`}
              />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {totalAttention}
              </p>
              <p className="text-xs text-muted-foreground">{t("dashboard.needAttention")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Care alert */}
      {careAlert && !careAlertDismissed && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3">
          <Droplets className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-blue-700 dark:text-blue-300">
              {t("components.careAlert", { condition: t("rides.conditions." + careAlert) })}
            </p>
          </div>
          <button
            onClick={() => setCareAlertDismissed(true)}
            className="text-blue-400 hover:text-blue-600 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search & filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("dashboard.searchPlaceholder")}
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          {(
            [
              { value: "good", label: t("dashboard.filterOk"), className: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" },
              { value: "approaching", label: t("dashboard.filterApproaching"), className: "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20" },
              { value: "warning", label: t("dashboard.filterWarning"), className: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20" },
              { value: "critical", label: t("dashboard.filterCritical"), className: "bg-red-500/10 text-red-600 hover:bg-red-500/20" },
              { value: "overdue", label: t("dashboard.filterOverdue"), className: "bg-red-500/10 text-red-600 hover:bg-red-500/20" },
            ] as const
          ).map((f) => {
            const active = statusFilters.has(f.value);
            return (
              <Badge
                key={f.value}
                variant={active ? "default" : "outline"}
                className={`cursor-pointer text-xs ${active ? "" : f.className}`}
                onClick={() => {
                  const next = new Set(statusFilters);
                  if (active) next.delete(f.value); else next.add(f.value);
                  setStatusFilters(next);
                }}
              >
                {f.label}
              </Badge>
            );
          })}
          {statusFilters.size > 0 && (
            <Badge variant="outline" className="cursor-pointer text-xs text-muted-foreground" onClick={() => setStatusFilters(new Set())}>
              {t("dashboard.filterAll")}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-2">{t("dashboard.sortBy")}:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs border rounded px-1.5 py-0.5 bg-background text-foreground"
          >
            <option value="status">{t("dashboard.sortStatus")}</option>
            <option value="name">{t("dashboard.sortName")}</option>
            <option value="km">{t("dashboard.sortKm")}</option>
            <option value="installDate">{t("dashboard.sortInstallDate")}</option>
          </select>
        </div>
      </div>

      {/* Bike sections */}
      {showTabs ? (
        <Tabs defaultValue={data[0].bike.id}>
          <TabsList>
            {data.map(({ bike, attentionCount }) => (
              <TabsTrigger key={bike.id} value={bike.id} className="gap-2">
                {bike.name}
                {syncingBikeId === bike.id ? (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                ) : attentionCount > 0 ? (
                  <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px]">
                    {attentionCount}
                  </Badge>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
          {data.map(({ bike, components: comps }) => {
            const filtered = comps.filter(matchesFilter).sort(sortComponents);
            return (
              <TabsContent key={bike.id} value={bike.id}>
                {syncingBikeId === bike.id ? (
                  <SyncingPlaceholder />
                ) : filtered.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">{t("common.noResults")}</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {filtered.map((comp) => (
                      <ComponentCard key={comp.id} component={comp} onReplace={handleReplace} onEdit={handleEditComponent} onRemove={handleRemoveComponent} isReplacing={replacing === comp.id} linkToDetail currency={currency} />
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      ) : (
        data.map(({ bike, components: comps, attentionCount }) => {
          const filtered = comps.filter(matchesFilter).sort(sortComponents);
          if (q && filtered.length === 0) return null;
          return (
            <div key={bike.id}>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-lg font-semibold">{bike.name}</h2>
                <Badge variant="secondary" className="capitalize text-xs">{bike.type}</Badge>
                {syncingBikeId === bike.id ? (
                  <Badge variant="secondary" className="gap-1.5 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t("dashboard.syncing")}
                  </Badge>
                ) : attentionCount > 0 ? (
                  <Badge variant="destructive" className="text-xs">{attentionCount} {t("dashboard.needAttention")}</Badge>
                ) : null}
              </div>
              {syncingBikeId === bike.id ? (
                <SyncingPlaceholder />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filtered.map((comp) => (
                    <ComponentCard key={comp.id} component={comp} onReplace={handleReplace} onEdit={handleEditComponent} onRemove={handleRemoveComponent} isReplacing={replacing === comp.id} linkToDetail currency={currency} />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

    </div>
  );
}

/** Shown while a newly-created trainer bike's Strava history is syncing. */
function SyncingPlaceholder() {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/30 p-6 flex flex-col items-center gap-3 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
        {t("dashboard.syncing")}
      </p>
      <p className="text-xs text-muted-foreground max-w-xs">
        {t("dashboard.syncingDescription")}
      </p>
    </div>
  );
}


