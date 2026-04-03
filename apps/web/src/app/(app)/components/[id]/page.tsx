"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getComponentStatus, type ComponentStatus } from "@bike-check/core";
import { useCurrency } from "@/lib/use-currency";
import { currencySymbol } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Pencil, Save, Trash2, Wrench, Link2, BatteryCharging, Droplets } from "lucide-react";
import { LEVEL_COLORS, LEVEL_BADGE } from "@/components/component-card";
import { useTranslation } from "@/hooks/use-translation";

const RELATED_COMPONENT_MAP: Record<string, string[]> = {
  chain: ["cassette", "chainrings"],
  cassette: ["chain", "chainrings"],
  front_brake_pads: ["brake_rotor_front"],
  rear_brake_pads: ["brake_rotor_rear"],
};

interface RelatedComponent {
  id: string;
  type: string;
  name: string;
  currentDistanceKm: string;
  currentHours: string;
  installDate: string;
  thresholdDistanceKm: string | null;
  thresholdHours: string | null;
  thresholdDays: number | null;
  status: string;
}

const EVENT_BADGE_CLASSES: Record<string, string> = {
  replaced: "bg-primary/10 text-primary",
  serviced: "bg-blue-500/10 text-blue-600",
  inspected: "bg-emerald-500/10 text-emerald-600",
  adjusted: "bg-yellow-500/10 text-yellow-600",
};

interface ComponentDetail {
  id: string;
  bikeId: string;
  bikeName: string;
  bikeType: string;
  type: string;
  name: string;
  brand?: string;
  model?: string;
  installDate: string;
  currentDistanceKm: string;
  currentHours: string;
  thresholdDistanceKm?: string;
  thresholdHours?: string;
  thresholdDays?: number;
  costCents?: number;
  wearOnIndoor: boolean;
  indoorWearMultiplier: string;
  notes?: string;
  batteryTracking?: boolean;
  batteryLifeHours?: string;
  batteryCurrentHours?: string;
  careTracking?: boolean;
  careIntervalKm?: string;
  careIntervalHours?: string;
  lastCareKm?: string;
  lastCareHours?: string;
}

interface MaintenanceEvent {
  id: string;
  eventType: string;
  date: string;
  distanceAtEvent?: string;
  hoursAtEvent?: string;
  costCents?: number;
  notes?: string;
  title?: string;
  relatedComponentIds?: string | null;
  componentId?: string | null;
}

export default function ComponentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const componentId = params.id as string;

  const currency = useCurrency();
  const cs = currencySymbol(currency);
  const { t } = useTranslation();
  const [comp, setComp] = useState<ComponentDetail | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceEvent[]>([]);
  const [relatedComponents, setRelatedComponents] = useState<RelatedComponent[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editable detail fields
  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editInstallDate, setEditInstallDate] = useState("");
  const [editCost, setEditCost] = useState("");

  // Editable threshold fields
  const [threshKm, setThreshKm] = useState("");
  const [threshHours, setThreshHours] = useState("");
  const [threshDays, setThreshDays] = useState("");
  const [wearIndoor, setWearIndoor] = useState(true);
  const [indoorMult, setIndoorMult] = useState("1.00");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [charging, setCharging] = useState(false);
  const [caring, setCaring] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [componentId]);

  async function fetchAll() {
    const [compRes, maintRes] = await Promise.all([
      fetch(`/api/components/${componentId}`),
      fetch(`/api/maintenance?componentId=${componentId}`),
    ]);
    if (compRes.status === 401) { router.push("/"); return; }
    if (compRes.status === 404) { router.push("/bikes"); return; }
    const compData = await compRes.json();
    setComp(compData);
    setEditName(compData.name ?? "");
    setEditBrand(compData.brand ?? "");
    setEditModel(compData.model ?? "");
    setEditInstallDate(compData.installDate ?? "");
    setEditCost(compData.costCents ? (compData.costCents / 100).toString() : "");
    setThreshKm(compData.thresholdDistanceKm ? Number(compData.thresholdDistanceKm).toString() : "");
    setThreshHours(compData.thresholdHours ? Number(compData.thresholdHours).toString() : "");
    setThreshDays(compData.thresholdDays?.toString() ?? "");
    setWearIndoor(compData.wearOnIndoor);
    setIndoorMult(Number(compData.indoorWearMultiplier).toString());
    setMaintenance(await maintRes.json());

    // Fetch related components if applicable
    const relatedTypes = RELATED_COMPONENT_MAP[compData.type];
    if (relatedTypes && compData.bikeId) {
      try {
        const bikeRes = await fetch(`/api/bikes/${compData.bikeId}?withComponents=true`);
        if (bikeRes.ok) {
          const bikeData = await bikeRes.json();
          const siblings = (bikeData.components ?? [])
            .filter((c: any) => relatedTypes.includes(c.type) && c.status === "active" && c.id !== componentId)
            .map((c: any) => {
              const s = getComponentStatus({
                currentDistanceKm: parseFloat(c.currentDistanceKm ?? "0"),
                currentHours: parseFloat(c.currentHours ?? "0"),
                installDate: c.installDate,
                thresholdDistanceKm: c.thresholdDistanceKm ? parseFloat(c.thresholdDistanceKm) : null,
                thresholdHours: c.thresholdHours ? parseFloat(c.thresholdHours) : null,
                thresholdDays: c.thresholdDays ?? null,
              });
              return {
                id: c.id,
                type: c.type,
                name: c.name,
                currentDistanceKm: c.currentDistanceKm ?? "0",
                currentHours: c.currentHours ?? "0",
                installDate: c.installDate,
                thresholdDistanceKm: c.thresholdDistanceKm ?? null,
                thresholdHours: c.thresholdHours ?? null,
                thresholdDays: c.thresholdDays ?? null,
                status: s.level,
              };
            });
          setRelatedComponents(siblings);
        }
      } catch {
        // ignore — related components are optional
      }
    } else {
      setRelatedComponents([]);
    }

    setLoading(false);
  }

  async function handleSaveThresholds() {
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {};
      // Detail fields
      if (editName.trim()) updates.name = editName.trim();
      if (editBrand.trim() !== (comp?.brand ?? "")) updates.brand = editBrand.trim() || null;
      if (editModel.trim() !== (comp?.model ?? "")) updates.model = editModel.trim() || null;
      if (editInstallDate && editInstallDate !== comp?.installDate) updates.installDate = editInstallDate;
      const costVal = parseFloat(editCost);
      if (!isNaN(costVal) && costVal >= 0) updates.costCents = Math.round(costVal * 100);
      else if (!editCost) updates.costCents = null;
      // Threshold fields
      const km = parseFloat(threshKm);
      if (!isNaN(km) && km > 0) updates.thresholdDistanceKm = km;
      const hrs = parseFloat(threshHours);
      if (!isNaN(hrs) && hrs > 0) updates.thresholdHours = hrs;
      const days = parseInt(threshDays);
      if (!isNaN(days) && days > 0) updates.thresholdDays = days;
      updates.wearOnIndoor = wearIndoor;
      const mult = parseFloat(indoorMult);
      if (!isNaN(mult)) updates.indoorWearMultiplier = mult;

      await fetch(`/api/components/${componentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await fetchAll();
    } finally {
      setSaving(false);
    }
  }

  async function handleCharge() {
    setCharging(true);
    try {
      await fetch(`/api/components/${componentId}/charge`, { method: "POST" });
      await fetchAll();
    } finally {
      setCharging(false);
    }
  }

  async function handleCare() {
    setCaring(true);
    try {
      await fetch(`/api/components/${componentId}/care`, { method: "POST" });
      await fetchAll();
    } finally {
      setCaring(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/components/${componentId}`, { method: "DELETE" });
    router.push(`/bikes/${comp?.bikeId}`);
  }

  if (loading || !comp) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const label = t("components.labels." + comp.type) || comp.name;
  const status = getComponentStatus({
    currentDistanceKm: parseFloat(comp.currentDistanceKm),
    currentHours: parseFloat(comp.currentHours),
    installDate: comp.installDate,
    thresholdDistanceKm: comp.thresholdDistanceKm ? parseFloat(comp.thresholdDistanceKm) : null,
    thresholdHours: comp.thresholdHours ? parseFloat(comp.thresholdHours) : null,
    thresholdDays: comp.thresholdDays,
  });
  const pct = Math.min(status.percentUsed, 100);
  const badge = LEVEL_BADGE[status.level];
  const daysSinceInstall = Math.floor(
    (Date.now() - new Date(comp.installDate).getTime()) / 86400000
  );

  const totalMaintenanceCost = maintenance.reduce(
    (s, e) => s + (e.costCents ?? 0), 0
  );

  const isBattery = comp.batteryTracking && comp.batteryLifeHours;
  const batteryLifeHrs = comp.batteryLifeHours ? Number(comp.batteryLifeHours) : 0;
  const batteryCurrentHrs = comp.batteryCurrentHours ? Number(comp.batteryCurrentHours) : 0;

  const isCare = comp.careTracking && (comp.careIntervalKm || comp.careIntervalHours);
  const kmSinceCare = isCare ? Number(comp.currentDistanceKm) - Number(comp.lastCareKm ?? 0) : 0;
  const hrsSinceCare = isCare ? Number(comp.currentHours) - Number(comp.lastCareHours ?? 0) : 0;
  const careIntervalKm = comp.careIntervalKm ? Number(comp.careIntervalKm) : 0;
  const careIntervalHrs = comp.careIntervalHours ? Number(comp.careIntervalHours) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href={`/bikes/${comp.bikeId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-3.5 w-3.5" />
          {comp.bikeName}
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{label}</h1>
            <Badge className={`text-[10px] uppercase tracking-wider ${badge.className}`}>
              {t("components.status." + status.level)}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        {(comp.brand || comp.model) && (
          <p className="text-sm text-muted-foreground mt-1">
            {comp.brand} {comp.model ?? ""}
          </p>
        )}
      </div>

      {/* Wear status card */}
      <Card>
        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{t("components.currentDistance")}</p>
              <p className="text-lg font-bold tabular-nums">{Number(comp.currentDistanceKm).toLocaleString()} km</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("components.currentHours")}</p>
              <p className="text-lg font-bold tabular-nums">{Number(comp.currentHours).toFixed(1)} hrs</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("components.installDate")}</p>
              <p className="text-lg font-bold">{comp.installDate}</p>
              <p className="text-xs text-muted-foreground">{t("components.daysAgo", { days: String(daysSinceInstall) })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("components.wear")}</p>
              <p className="text-lg font-bold tabular-nums">{status.percentUsed.toFixed(0)}%</p>
            </div>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${LEVEL_COLORS[status.level]}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Editable details */}
      <Card>
        <CardContent className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{t("components.editTitle")}</h3>
            <Button size="sm" onClick={handleSaveThresholds} disabled={saving}>
              {saved ? t("common.saved") : saving ? t("common.saving") : <><Save className="h-3.5 w-3.5" /> {t("common.save")}</>}
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t("common.name")}</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-brand">{t("components.brand")}</Label>
              <Input id="edit-brand" value={editBrand} onChange={(e) => setEditBrand(e.target.value)} placeholder="e.g., Shimano" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-model">{t("components.model")}</Label>
              <Input id="edit-model" value={editModel} onChange={(e) => setEditModel(e.target.value)} placeholder="e.g., CN-HG701" />
            </div>
            <div className="space-y-2">
              <Label>{t("components.installDate")}</Label>
              <DatePicker value={editInstallDate} onChange={setEditInstallDate} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cost">{t("components.cost")} ({cs})</Label>
              <Input id="edit-cost" type="number" step="0.01" min="0" placeholder="0.00" value={editCost} onChange={(e) => setEditCost(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Thresholds */}
      <Card>
        <CardContent className="space-y-4 pt-2">
          <h3 className="font-semibold">{t("components.thresholdsTitle")}</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="thresh-km">{t("components.distanceKm")}</Label>
              <Input id="thresh-km" type="number" placeholder="3000" value={threshKm} onChange={(e) => setThreshKm(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thresh-hrs">{t("components.hours")}</Label>
              <Input id="thresh-hrs" type="number" placeholder="200" value={threshHours} onChange={(e) => setThreshHours(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thresh-days">{t("components.days")}</Label>
              <Input id="thresh-days" type="number" placeholder="90" value={threshDays} onChange={(e) => setThreshDays(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={wearIndoor} onCheckedChange={setWearIndoor} />
              <Label className="text-sm">{t("components.wearOnIndoor")}</Label>
            </div>
            {wearIndoor && (
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">{t("components.multiplier")}</Label>
                <Input className="w-20 h-8" type="number" step="0.1" min="0" max="2" value={indoorMult} onChange={(e) => setIndoorMult(e.target.value)} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cost summary */}
      {((comp.costCents ?? 0) + totalMaintenanceCost > 0) && (
        <Card>
          <CardContent className="pt-2">
            <h3 className="font-semibold mb-3">{t("components.costTrackingTitle")}</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{t("components.purchasePrice")}</p>
                <p className="text-lg font-bold tabular-nums">
                  {comp.costCents ? `${cs}${(comp.costCents / 100).toFixed(2)}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("components.maintenanceCostLabel")}</p>
                <p className="text-lg font-bold tabular-nums">
                  {totalMaintenanceCost > 0 ? `${cs}${(totalMaintenanceCost / 100).toFixed(2)}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("components.totalSpentLabel")}</p>
                <p className="text-lg font-bold tabular-nums">
                  {cs}{(((comp.costCents ?? 0) + totalMaintenanceCost) / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Battery tracking */}
      {isBattery && (
        <Card>
          <CardContent className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <BatteryCharging className="h-4 w-4 text-emerald-500" />
                {t("components.batteryStatus")}
              </h3>
              <Button
                variant="outline"
                size="sm"
                disabled={charging}
                onClick={handleCharge}
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
              >
                <BatteryCharging className="h-3.5 w-3.5" />
                {charging ? t("components.charging") : t("components.markCharged")}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{t("components.batteryLifeLabel")}</p>
                <p className="text-lg font-bold tabular-nums">{batteryLifeHrs} hrs</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("components.currentHoursUsed")}</p>
                <p className="text-lg font-bold tabular-nums">{batteryCurrentHrs.toFixed(1)} hrs</p>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  batteryLifeHrs > 0 && batteryCurrentHrs / batteryLifeHrs >= 0.9
                    ? "bg-red-500"
                    : batteryLifeHrs > 0 && batteryCurrentHrs / batteryLifeHrs >= 0.7
                      ? "bg-yellow-500"
                      : "bg-emerald-500"
                }`}
                style={{ width: `${batteryLifeHrs > 0 ? Math.min((batteryCurrentHrs / batteryLifeHrs) * 100, 100) : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Care tracking */}
      {isCare && (
        <Card>
          <CardContent className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                {t("components.careStatus")}
              </h3>
              <Button
                variant="outline"
                size="sm"
                disabled={caring}
                onClick={handleCare}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
              >
                <Droplets className="h-3.5 w-3.5" />
                {caring ? t("components.caring") : t("components.markCared")}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{t("components.careInterval")}</p>
                <p className="text-lg font-bold tabular-nums">
                  {careIntervalKm > 0 ? `${careIntervalKm} km` : `${careIntervalHrs} hrs`}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("components.sinceCare")}</p>
                <p className="text-lg font-bold tabular-nums">
                  {careIntervalKm > 0
                    ? `${Math.round(kmSinceCare)} km`
                    : `${Math.round(hrsSinceCare)} hrs`}
                </p>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (careIntervalKm > 0 ? kmSinceCare / careIntervalKm : hrsSinceCare / careIntervalHrs) >= 1
                    ? "bg-orange-500"
                    : (careIntervalKm > 0 ? kmSinceCare / careIntervalKm : hrsSinceCare / careIntervalHrs) >= 0.8
                      ? "bg-yellow-500"
                      : "bg-blue-400"
                }`}
                style={{
                  width: `${Math.min(
                    (careIntervalKm > 0 ? kmSinceCare / careIntervalKm : hrsSinceCare / careIntervalHrs) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related components */}
      {relatedComponents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            {t("components.relatedComponents")}
          </h2>
          <div className="space-y-2">
            {relatedComponents.map((rc) => {
              const rcBadge = LEVEL_BADGE[rc.status] ?? LEVEL_BADGE.good;
              const rcLabel = t("components.labels." + rc.type) || rc.name;
              return (
                <Link key={rc.id} href={`/components/${rc.id}`}>
                  <Card size="sm" className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{rcLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {Number(rc.currentDistanceKm).toLocaleString()} km
                        </p>
                      </div>
                      <Badge className={`text-[10px] uppercase tracking-wider ${rcBadge.className}`}>
                        {rc.status}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Maintenance history */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("components.maintenanceHistoryTitle")}</h2>
        {maintenance.length === 0 ? (
          <Card size="sm">
            <CardContent className="text-sm text-muted-foreground text-center py-8">
              {t("components.noMaintenanceEvents")}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {maintenance.map((event) => {
              // If this is a general maintenance event that includes this component
              // in relatedComponentIds, display it as "replaced" instead of "general"
              const isGeneralWithThisComponent = event.eventType === "general"
                && event.relatedComponentIds
                && event.relatedComponentIds.includes(componentId);
              const displayEventType = isGeneralWithThisComponent ? "replaced" : event.eventType;
              const ebClass = EVENT_BADGE_CLASSES[displayEventType] ?? EVENT_BADGE_CLASSES.replaced;
              return (
                <Card key={event.id} size="sm">
                  <CardContent className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] ${ebClass}`}>{t("maintenance.eventTypes." + displayEventType)}</Badge>
                        <span className="text-sm text-muted-foreground">{event.date}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.distanceAtEvent && `${Number(event.distanceAtEvent).toLocaleString()} km`}
                        {event.costCents && ` \u00b7 ${cs}${(event.costCents / 100).toFixed(2)}`}
                        {event.notes && ` \u00b7 ${event.notes}`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("components.removeTitle")}</DialogTitle>
            <DialogDescription>
              {t("components.removeConfirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t("common.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
