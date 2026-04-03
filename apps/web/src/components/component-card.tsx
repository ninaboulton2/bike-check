"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { BatteryCharging, Droplets, Info, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { currencySymbol } from "@/lib/currency";

export interface ComponentStatus {
  level: "good" | "approaching" | "warning" | "critical" | "overdue";
  percentUsed: number;
  remainingKm?: number;
  remainingHours?: number;
  remainingDays?: number;
}

export interface DashboardComponent {
  id: string;
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
  batteryTracking?: boolean;
  batteryLifeHours?: string;
  careTracking?: boolean;
  careIntervalKm?: string;
  careIntervalHours?: string;
  lastCareKm?: string;
  lastCareHours?: string;
  status: ComponentStatus;
}

export const LEVEL_COLORS: Record<string, string> = {
  good: "bg-emerald-500",
  approaching: "bg-yellow-500",
  warning: "bg-orange-500",
  critical: "bg-red-500",
  overdue: "bg-red-600",
};

export const LEVEL_BADGE: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline"; className: string }
> = {
  good: { variant: "secondary", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  approaching: { variant: "secondary", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  warning: { variant: "secondary", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  critical: { variant: "destructive", className: "bg-red-500/10 text-red-600 border-red-500/20" },
  overdue: { variant: "destructive", className: "bg-red-600/15 text-red-700 border-red-500/30" },
};

export function ComponentCard({
  component: comp,
  onReplace,
  onEdit,
  onRemove,
  isReplacing,
  linkToDetail,
  currency,
}: {
  component: DashboardComponent;
  onReplace: (
    id: string,
    opts: { date: string; costCents?: number; notes?: string }
  ) => void;
  onEdit: (id: string, updates: Record<string, unknown>) => Promise<void>;
  onRemove?: (id: string) => void;
  isReplacing: boolean;
  linkToDetail?: boolean;
  currency?: string;
}) {
  const { t, locale } = useTranslation();
  const cs = currencySymbol(currency ?? "EUR");
  const { status } = comp;
  const pct = Math.min(status.percentUsed, 100);
  const label = t("components.labels." + comp.type) || comp.name;
  const badge = LEVEL_BADGE[status.level];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [replaceDate, setReplaceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [replaceCost, setReplaceCost] = useState("");
  const [replaceNotes, setReplaceNotes] = useState("");

  const [removeOpen, setRemoveOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editBrand, setEditBrand] = useState(comp.brand ?? "");
  const [editModel, setEditModel] = useState(comp.model ?? "");
  const [editInstallDate, setEditInstallDate] = useState(comp.installDate ?? "");
  const [editDistanceKm, setEditDistanceKm] = useState(
    Number(comp.currentDistanceKm).toString()
  );
  const [editThresholdKm, setEditThresholdKm] = useState(
    comp.thresholdDistanceKm ? Number(comp.thresholdDistanceKm).toString() : ""
  );
  const [editThresholdHours, setEditThresholdHours] = useState(
    comp.thresholdHours ? Number(comp.thresholdHours).toString() : ""
  );
  const [editCost, setEditCost] = useState(
    comp.costCents ? (comp.costCents / 100).toFixed(2) : ""
  );
  const [editBattery, setEditBattery] = useState(comp.batteryTracking ?? false);
  const [editBatteryLife, setEditBatteryLife] = useState(
    comp.batteryLifeHours ? Number(comp.batteryLifeHours).toString() : ""
  );
  const [charging, setCharging] = useState(false);
  const [editCare, setEditCare] = useState(comp.careTracking ?? false);
  const [editCareKm, setEditCareKm] = useState(
    comp.careIntervalKm ? Number(comp.careIntervalKm).toString() : ""
  );
  const [editCareHours, setEditCareHours] = useState(
    comp.careIntervalHours ? Number(comp.careIntervalHours).toString() : ""
  );
  const [caring, setCaring] = useState(false);

  let metric = "";
  let threshold = "";
  if (comp.thresholdDistanceKm) {
    metric = `${Number(comp.currentDistanceKm).toLocaleString()} km`;
    threshold = `${Number(comp.thresholdDistanceKm).toLocaleString()} km`;
  } else if (comp.thresholdHours) {
    metric = `${Number(comp.currentHours).toFixed(0)} hrs`;
    threshold = `${Number(comp.thresholdHours).toFixed(0)} hrs`;
  } else if (comp.thresholdDays && status.remainingDays !== undefined) {
    const daysSinceInstall = comp.thresholdDays - status.remainingDays;
    metric = `${daysSinceInstall} days`;
    threshold = `${comp.thresholdDays} days`;
  }

  let statusMessage = "";
  if (status.level === "overdue") {
    statusMessage = t("components.status.overdueMessage");
  } else if (status.level === "critical") {
    statusMessage = t("components.status.replaceSoon");
  } else if (status.level === "warning") {
    statusMessage = status.remainingKm
      ? t("components.status.remainingKm", { km: Math.round(status.remainingKm) })
      : status.remainingDays
        ? t("components.status.remainingDays", { days: status.remainingDays })
        : "";
  } else if (status.level === "approaching") {
    statusMessage = t("components.status.approaching");
  }

  const daysSinceInstall = Math.floor(
    (Date.now() - new Date(comp.installDate).getTime()) / 86400000
  );

  const needsAttention =
    status.level === "warning" ||
    status.level === "critical" ||
    status.level === "overdue";

  function handleSubmitReplace() {
    onReplace(comp.id, {
      date: replaceDate,
      costCents: replaceCost ? Math.round(parseFloat(replaceCost) * 100) : undefined,
      notes: replaceNotes || undefined,
    });
    setDialogOpen(false);
    setReplaceCost("");
    setReplaceNotes("");
  }

  async function handleSubmitEdit() {
    setEditSaving(true);
    try {
      const updates: Record<string, unknown> = {};
      if (editBrand !== (comp.brand ?? "")) updates.brand = editBrand || undefined;
      if (editModel !== (comp.model ?? "")) updates.model = editModel || undefined;
      if (editInstallDate && editInstallDate !== comp.installDate) updates.installDate = editInstallDate;
      const newDist = parseFloat(editDistanceKm);
      if (!isNaN(newDist) && newDist !== Number(comp.currentDistanceKm))
        updates.currentDistanceKm = newDist;
      const newThreshKm = parseFloat(editThresholdKm);
      if (!isNaN(newThreshKm) && newThreshKm !== Number(comp.thresholdDistanceKm))
        updates.thresholdDistanceKm = newThreshKm;
      const newThreshH = parseFloat(editThresholdHours);
      if (!isNaN(newThreshH) && newThreshH !== Number(comp.thresholdHours))
        updates.thresholdHours = newThreshH;
      const newCost = parseFloat(editCost);
      if (!isNaN(newCost))
        updates.costCents = Math.round(newCost * 100);
      if (editBattery !== (comp.batteryTracking ?? false))
        updates.batteryTracking = editBattery;
      const newBatteryLife = parseFloat(editBatteryLife);
      if (!isNaN(newBatteryLife) && newBatteryLife !== Number(comp.batteryLifeHours))
        updates.batteryLifeHours = newBatteryLife;
      if (editCare !== (comp.careTracking ?? false))
        updates.careTracking = editCare;
      const newCareKm = parseFloat(editCareKm);
      if (!isNaN(newCareKm) && newCareKm !== Number(comp.careIntervalKm))
        updates.careIntervalKm = newCareKm;
      const newCareH = parseFloat(editCareHours);
      if (!isNaN(newCareH) && newCareH !== Number(comp.careIntervalHours))
        updates.careIntervalHours = newCareH;

      if (Object.keys(updates).length > 0) {
        await onEdit(comp.id, updates);
      }
      setEditOpen(false);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleCharge() {
    setCharging(true);
    try {
      await fetch(`/api/components/${comp.id}/charge`, { method: "POST" });
      // Trigger refresh via a no-op edit
      await onEdit(comp.id, {});
    } finally {
      setCharging(false);
    }
  }

  async function handleCare() {
    setCaring(true);
    try {
      await fetch(`/api/components/${comp.id}/care`, { method: "POST" });
      await onEdit(comp.id, {});
    } finally {
      setCaring(false);
    }
  }

  const isBattery = comp.batteryTracking && comp.batteryLifeHours;
  const isCare = comp.careTracking && (comp.careIntervalKm || comp.careIntervalHours);
  const kmSinceCare = isCare ? Number(comp.currentDistanceKm) - Number(comp.lastCareKm ?? 0) : 0;
  const hrsSinceCare = isCare ? Number(comp.currentHours) - Number(comp.lastCareHours ?? 0) : 0;
  const careIntervalKm = comp.careIntervalKm ? Number(comp.careIntervalKm) : 0;
  const careIntervalHrs = comp.careIntervalHours ? Number(comp.careIntervalHours) : 0;
  const carePct = isCare
    ? Math.min(
        careIntervalKm > 0 ? (kmSinceCare / careIntervalKm) * 100 : 0,
        careIntervalHrs > 0 ? (hrsSinceCare / careIntervalHrs) * 100 : 0,
      ) || (careIntervalKm > 0 ? (kmSinceCare / careIntervalKm) * 100 : (hrsSinceCare / careIntervalHrs) * 100)
    : 0;
  const careNeeded = carePct >= 80;

  const nameEl = linkToDetail ? (
    <Link href={`/components/${comp.id}`} className="font-semibold text-sm truncate hover:underline">
      {label}
    </Link>
  ) : (
    <p className="font-semibold text-sm truncate">{label}</p>
  );

  return (
    <Card
      size="sm"
      className={
        needsAttention
          ? "border-red-500/20 shadow-sm shadow-red-500/5"
          : undefined
      }
    >
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {nameEl}
              {isBattery && <BatteryCharging className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
              {isCare && <Droplets className={`h-3.5 w-3.5 shrink-0 ${careNeeded ? "text-orange-500" : "text-blue-400"}`} />}
            </div>
            {comp.brand && (
              <p className="text-xs text-muted-foreground truncate">
                {comp.brand} {comp.model ?? ""}
              </p>
            )}
          </div>
          {status.level !== "good" && (
            <Badge className={`shrink-0 text-[10px] uppercase tracking-wider ${badge.className}`}>
              {t("components.status." + status.level)}
            </Badge>
          )}
        </div>

        <div>
          <div className="flex items-baseline justify-between text-sm mb-1.5">
            <span className="font-medium tabular-nums">{metric}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              / {threshold}
              {t("components.thresholdInfo." + comp.type) && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowInfo(!showInfo); }}
                  className="inline-flex items-center justify-center rounded-full text-muted-foreground/60 hover:text-foreground transition-colors"
                  aria-label="Threshold info"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          </div>
          {showInfo && t("components.thresholdInfo." + comp.type) && (
            <div className="mb-2 rounded-md border bg-muted/50 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
              {t("components.thresholdInfo." + comp.type)}
            </div>
          )}
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${LEVEL_COLORS[status.level]}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground tabular-nums">
              {status.percentUsed.toFixed(0)}%
            </span>
            {statusMessage && (
              <span
                className={`text-xs font-medium ${
                  needsAttention ? "text-red-600" : "text-muted-foreground"
                }`}
              >
                {statusMessage}
              </span>
            )}
          </div>
        </div>

        {/* Care tracking bar */}
        {isCare && (
          <div className="pt-1 border-t border-border/30">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className={`font-medium ${careNeeded ? "text-orange-600" : "text-blue-500"}`}>
                <Droplets className="h-3 w-3 inline mr-0.5" />
                {careIntervalKm > 0
                  ? t("components.kmSinceCare", { km: Math.round(kmSinceCare).toString() })
                  : t("components.hrsSinceCare", { hrs: Math.round(hrsSinceCare).toString() })}
              </span>
              <span className="text-muted-foreground">
                / {careIntervalKm > 0 ? `${careIntervalKm} km` : `${careIntervalHrs} hrs`}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-500 ${carePct >= 100 ? "bg-orange-500" : carePct >= 80 ? "bg-yellow-500" : "bg-blue-400"}`}
                style={{ width: `${Math.min(carePct, 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <span className="text-[11px] text-muted-foreground">
            {t("components.installedAgo", { days: String(daysSinceInstall) })} · {new Date(comp.installDate).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB")}
          </span>
          <div className="flex gap-1.5">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger render={<Button variant="ghost" size="xs" />}>
                <Pencil className="h-3 w-3" />
                {t("common.edit")}
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{t("components.editTitle")} - {label}</DialogTitle>
                  <DialogDescription>
                    {t("components.editDescription")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="edit-brand">{t("components.brand")}</Label>
                      <Input id="edit-brand" placeholder="e.g., Shimano" value={editBrand} onChange={(e) => setEditBrand(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-model">{t("components.model")}</Label>
                      <Input id="edit-model" placeholder="e.g., CN-HG701" value={editModel} onChange={(e) => setEditModel(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-install-date">{t("components.installDate")}</Label>
                    <DatePicker id="edit-install-date" value={editInstallDate} onChange={setEditInstallDate} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="edit-distance">{t("components.thresholdKm")}</Label>
                      <Input id="edit-distance" type="number" step="0.01" value={editDistanceKm} onChange={(e) => setEditDistanceKm(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-threshold-km">{t("components.thresholdKm")}</Label>
                      <Input id="edit-threshold-km" type="number" step="1" placeholder="e.g., 3000" value={editThresholdKm} onChange={(e) => setEditThresholdKm(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="edit-threshold-hours">{t("components.thresholdHours")}</Label>
                      <Input id="edit-threshold-hours" type="number" step="1" placeholder="e.g., 200" value={editThresholdHours} onChange={(e) => setEditThresholdHours(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-cost">{t("components.cost")} ({cs})</Label>
                      <Input id="edit-cost" type="number" step="0.01" placeholder="0.00" value={editCost} onChange={(e) => setEditCost(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">{t("components.batteryTracking")}</Label>
                      <p className="text-xs text-muted-foreground">{t("components.batteryTrackingDescription")}</p>
                    </div>
                    <Switch checked={editBattery} onCheckedChange={setEditBattery} />
                  </div>
                  {editBattery && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-battery-hours">{t("components.batteryLife")}</Label>
                      <Input
                        id="edit-battery-hours"
                        type="number"
                        step="1"
                        placeholder="e.g., 60"
                        value={editBatteryLife}
                        onChange={(e) => setEditBatteryLife(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">{t("components.careTracking")}</Label>
                      <p className="text-xs text-muted-foreground">{t("components.careTrackingDescription")}</p>
                    </div>
                    <Switch checked={editCare} onCheckedChange={setEditCare} />
                  </div>
                  {editCare && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="edit-care-km">{t("components.careIntervalKm")}</Label>
                        <Input id="edit-care-km" type="number" step="1" placeholder="e.g., 200" value={editCareKm} onChange={(e) => setEditCareKm(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-care-hours">{t("components.careIntervalHours")}</Label>
                        <Input id="edit-care-hours" type="number" step="1" placeholder="e.g., 40" value={editCareHours} onChange={(e) => setEditCareHours(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditOpen(false)}>{t("common.cancel")}</Button>
                  <Button
                    onClick={handleSubmitEdit}
                    disabled={
                      editSaving ||
                      (editBattery && (!editBatteryLife || parseFloat(editBatteryLife) <= 0)) ||
                      (editCare && (!editCareKm || parseFloat(editCareKm) <= 0) && (!editCareHours || parseFloat(editCareHours) <= 0))
                    }
                  >
                    {editSaving ? t("common.saving") : t("common.save")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {isBattery && (
              <Button
                variant="outline"
                size="xs"
                disabled={charging}
                onClick={handleCharge}
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
              >
                <BatteryCharging className="h-3 w-3" />
                {charging ? t("components.charging") : t("components.markCharged")}
              </Button>
            )}

            {isCare && (
              <Button
                variant="outline"
                size="xs"
                disabled={caring}
                onClick={handleCare}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
              >
                <Droplets className="h-3 w-3" />
                {caring ? t("components.caring") : t("components.markCared")}
              </Button>
            )}

            {needsAttention && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger render={<Button variant="outline" size="xs" disabled={isReplacing} />}>
                  <RefreshCw className="h-3 w-3" />
                  {isReplacing ? t("common.saving") : t("components.replaceTitle")}
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t("components.replaceTitle")} - {label}</DialogTitle>
                    <DialogDescription>{t("components.replaceDescription")}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="replace-date">{t("maintenance.date")}</Label>
                      <DatePicker id="replace-date" value={replaceDate} onChange={setReplaceDate} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="replace-cost">{t("components.cost")} ({cs})</Label>
                      <Input id="replace-cost" type="number" step="0.01" placeholder="0.00" value={replaceCost} onChange={(e) => setReplaceCost(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="replace-notes">{t("components.notes")}</Label>
                      <Input id="replace-notes" placeholder="e.g., upgraded to KMC X12" value={replaceNotes} onChange={(e) => setReplaceNotes(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
                    <Button onClick={handleSubmitReplace} disabled={isReplacing}>
                      {isReplacing ? t("common.saving") : t("common.confirm")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {onRemove && (
              <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
                <DialogTrigger render={<Button variant="ghost" size="xs" className="text-muted-foreground hover:text-red-500" />}>
                  <Trash2 className="h-3 w-3" />
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>{t("components.removeTitle")} - {label}</DialogTitle>
                    <DialogDescription>
                      {t("components.removeConfirm")}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRemoveOpen(false)}>{t("common.cancel")}</Button>
                    <Button variant="destructive" onClick={() => { onRemove(comp.id); setRemoveOpen(false); }}>
                      {t("common.remove")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
