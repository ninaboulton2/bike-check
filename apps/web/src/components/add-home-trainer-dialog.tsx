"use client";

import { useEffect, useState } from "react";
import {
  TRAINER_COMPONENT_TEMPLATES,
  TRAINER_WEAR_MATRIX,
  type ComponentTemplate,
} from "@bike-check/shared";
import { useTranslation } from "@/hooks/use-translation";
import { useCurrency } from "@/lib/use-currency";
import { currencySymbol } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2, Info, Pencil, RotateCcw } from "lucide-react";

const TRAINER_TYPE_KEYS = ["direct_drive", "wheel_on", "rollers", "smart_bike"] as const;

/** Components of the *linked outdoor bike* that accumulate indoor wear
 *  for a given trainer type (derived from TRAINER_WEAR_MATRIX). */
function linkedBikeWearInfo(trainerType: string, t: (key: string) => string): { label: string; multiplier: number }[] {
  const matrix = TRAINER_WEAR_MATRIX[trainerType] ?? {};
  return Object.entries(matrix)
    .filter(([, mult]) => (mult as number) > 0)
    .map(([type, mult]) => ({
      label: t("components.labels." + type),
      multiplier: mult as number,
    }))
    .sort((a, b) => b.multiplier - a.multiplier);
}

interface OutdoorBike {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outdoorBikes: OutdoorBike[];
  /** Called with the new trainer bike's id as soon as it is created in the DB,
   *  before the background Strava sync finishes. */
  onCreated: (bikeId: string) => void;
}

/** Per-component field overrides set before the component is created. */
interface CompOverride {
  name: string;
  brand: string;
  model: string;
  installDate: string;
  thresholdDistanceKm: string;
  thresholdHours: string;
  costCents: string;
}

function defaultOverride(comp: ComponentTemplate, today: string): CompOverride {
  return {
    name: comp.name,
    brand: "",
    model: "",
    installDate: today,
    thresholdDistanceKm: comp.thresholdDistanceKm?.toString() ?? "",
    thresholdHours: comp.thresholdHours?.toString() ?? "",
    costCents: "",
  };
}

interface InactiveTrainer {
  id: string;
  name: string;
  linkedBikeId: string | null;
  updatedAt: string;
}

export function AddHomeTrainerDialog({ open, onOpenChange, outdoorBikes, onCreated }: Props) {
  const { t } = useTranslation();
  const currency = useCurrency();
  const cs = currencySymbol(currency);
  const today = new Date().toISOString().split("T")[0];

  const [name, setName] = useState("Home trainer");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [trainerType, setTrainerType] = useState("direct_drive");
  const [linkedBikeId, setLinkedBikeId] = useState<string>("none");
  const [saving, setSaving] = useState(false);

  // Deactivated trainers available for reactivation
  const [inactiveTrainers, setInactiveTrainers] = useState<InactiveTrainer[]>([]);
  const [reactivating, setReactivating] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetch("/api/bikes?inactive=trainer")
        .then((r) => r.json())
        .then(setInactiveTrainers)
        .catch(() => setInactiveTrainers([]));
    }
  }, [open]);

  // Install date for the trainer itself — used as the `after` cutoff for sync
  // and as the default date pre-filled into component install dates.
  const [trainerInstallDate, setTrainerInstallDate] = useState(today);
  // True once the user explicitly picks a date (vs leaving the today default)
  const [installDateTouched, setInstallDateTouched] = useState(false);
  // When true, show the install-date warning and require confirmation
  const [showInstallWarning, setShowInstallWarning] = useState(false);

  // Checklist of included component types
  const [includedTypes, setIncludedTypes] = useState<Set<string>>(
    () => new Set((TRAINER_COMPONENT_TEMPLATES.direct_drive ?? []).map((c) => c.type))
  );

  // Per-component field overrides (name, install date, thresholds, brand…)
  const [compOverrides, setCompOverrides] = useState<Record<string, CompOverride>>(() => {
    const template = TRAINER_COMPONENT_TEMPLATES.direct_drive ?? [];
    return Object.fromEntries(template.map((c) => [c.type, defaultOverride(c, today)]));
  });

  // Which component type is open in the edit dialog right now
  const [editingType, setEditingType] = useState<string | null>(null);
  // Mutable draft for the currently open edit dialog
  const [editDraft, setEditDraft] = useState<CompOverride | null>(null);

  useEffect(() => {
    const template = TRAINER_COMPONENT_TEMPLATES[trainerType] ?? [];
    setIncludedTypes(new Set(template.map((c) => c.type)));
    // Reset overrides to template defaults when trainer type changes,
    // preserving the current trainerInstallDate
    setCompOverrides(
      Object.fromEntries(template.map((c) => [c.type, defaultOverride(c, trainerInstallDate)]))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainerType]);

  /** Called when the user explicitly changes the trainer install date.
   *  Propagates the date to all component overrides so they stay in sync. */
  function handleTrainerInstallDateChange(date: string) {
    setTrainerInstallDate(date);
    setInstallDateTouched(true);
    setShowInstallWarning(false);
    // Push the new date down to every component's override
    setCompOverrides((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = { ...next[key], installDate: date };
      }
      return next;
    });
  }

  const trainerHardwareTemplate: ComponentTemplate[] = TRAINER_COMPONENT_TEMPLATES[trainerType] ?? [];
  const linkedBikeComponents = linkedBikeWearInfo(trainerType, t);

  function toggleType(type: string) {
    setIncludedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function openEditDialog(type: string) {
    const override = compOverrides[type] ?? defaultOverride(
      trainerHardwareTemplate.find((c) => c.type === type)!,
      today
    );
    setEditDraft({ ...override });
    setEditingType(type);
  }

  function saveEditDraft() {
    if (!editingType || !editDraft) return;
    setCompOverrides((prev) => ({ ...prev, [editingType]: editDraft }));
    setEditingType(null);
    setEditDraft(null);
  }

  /** Triggered by the primary "Add trainer" button.
   *  If no explicit install date was set, shows an inline warning first. */
  function handleSubmitIntent() {
    if (!installDateTouched) {
      setShowInstallWarning(true);
      return;
    }
    handleCreate();
  }

  async function handleReactivate(trainerId: string) {
    setReactivating(trainerId);
    try {
      await fetch(`/api/bikes/${trainerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      onOpenChange(false);
      onCreated(trainerId);
    } catch {
      // ignore
    } finally {
      setReactivating(null);
    }
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setShowInstallWarning(false);
    setSaving(true);
    try {
      // Save trainer type to user settings (affects outdoor-bike indoor wear calc)
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainerType }),
      });

      // Create trainer bike without auto-template
      const bikeRes = await fetch("/api/bikes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type: "trainer",
          isTrainer: true,
          linkedBikeId: linkedBikeId === "none" ? null : linkedBikeId,
          purchasePriceCents: purchasePrice ? Math.round(parseFloat(purchasePrice) * 100) : undefined,
          applyTemplate: false,
        }),
      });
      if (!bikeRes.ok) throw new Error("Failed to create trainer bike");
      const bike = await bikeRes.json();

      // Create only the selected trainer-hardware components, with any
      // user overrides (name, install date, thresholds, brand, model…) applied.
      const selectedComponents = trainerHardwareTemplate.filter((c) => includedTypes.has(c.type));
      for (const comp of selectedComponents) {
        const ov = compOverrides[comp.type] ?? defaultOverride(comp, today);
        await fetch(`/api/bikes/${bike.id}/components`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: comp.type,
            name: ov.name || comp.name,
            brand: ov.brand || undefined,
            model: ov.model || undefined,
            installDate: ov.installDate || today,
            thresholdDistanceKm: ov.thresholdDistanceKm
              ? parseFloat(ov.thresholdDistanceKm)
              : comp.thresholdDistanceKm,
            thresholdHours: ov.thresholdHours
              ? parseFloat(ov.thresholdHours)
              : comp.thresholdHours,
            thresholdDays: comp.thresholdDays,
            costCents: ov.costCents ? Math.round(parseFloat(ov.costCents) * 100) : undefined,
            wearOnIndoor: comp.wearOnIndoor,
            indoorWearMultiplier: comp.indoorWearMultiplier,
          }),
        });
      }

      // Close the dialog and hand control back to the parent immediately —
      // the user doesn't need to wait for the slow Strava re-sync.
      onOpenChange(false);
      setName("Home trainer");
      setPurchasePrice("");
      setTrainerType("direct_drive");
      setLinkedBikeId("none");
      setTrainerInstallDate(today);
      setInstallDateTouched(false);
      setShowInstallWarning(false);

      // Mark this bike as syncing in localStorage BEFORE calling onCreated,
      // so the dashboard polling can check the key as soon as it mounts.
      const syncKey = `trainer_syncing_${bike.id}`;
      localStorage.setItem(syncKey, "pending");

      onCreated(bike.id);

      // Fire a re-sync starting from the trainer install date (not epoch 0),
      // so we only process rides that could actually belong to this trainer.
      // The dashboard polls localStorage for 'done' rather than watching km,
      // which prevents the placeholder from vanishing while sync is still running.
      const afterEpoch = installDateTouched
        ? Math.floor(new Date(trainerInstallDate).getTime() / 1000)
        : 0;
      const resolvedLinkedBikeId = linkedBikeId === "none" ? null : linkedBikeId;
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ after: afterEpoch }),
      }).then(() => {
        if (selectedComponents.length > 0) {
          return fetch(`/api/bikes/${bike.id}/recalculate`, { method: "POST" });
        }
      }).then(() => {
        // Recalculate the linked outdoor bike's component kms so indoor rides
        // are properly accounted for via the trainer wear matrix.
        if (resolvedLinkedBikeId) {
          return fetch(`/api/bikes/${resolvedLinkedBikeId}/recalculate`, { method: "POST" });
        }
      }).then(() => {
        localStorage.setItem(syncKey, "done");
      }).catch(() => {
        // Even on error, mark as done so the placeholder eventually clears
        localStorage.setItem(syncKey, "done");
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("trainer.addHomeTrainer")}</DialogTitle>
          <DialogDescription>
            {t("trainer.addDialogDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Reactivate a previously removed trainer */}
          {inactiveTrainers.length > 0 && (
            <div className="space-y-2">
              <Label>{t("trainer.reactivatePrevious")}</Label>
              <div className="rounded-lg border divide-y">
                {inactiveTrainers.map((tr) => {
                  const linkedName = outdoorBikes.find((b) => b.id === tr.linkedBikeId)?.name;
                  return (
                    <div
                      key={tr.id}
                      className="flex items-center justify-between px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{tr.name}</p>
                        {linkedName && (
                          <p className="text-xs text-muted-foreground">
                            {t("trainer.linkedTo")} {linkedName}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reactivating === tr.id}
                        onClick={() => handleReactivate(tr.id)}
                      >
                        {reactivating === tr.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        {t("bikes.reactivate")}
                      </Button>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("trainer.reactivateRestore")}
              </p>
            </div>
          )}

          {/* Name + Install date — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="trainer-name">{t("common.name")}</Label>
              <Input
                id="trainer-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Home trainer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trainer-install-date">
                {t("components.installDate")}
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">{t("trainer.installDateHint")}</span>
              </Label>
              <DatePicker
                id="trainer-install-date"
                value={trainerInstallDate}
                onChange={handleTrainerInstallDateChange}
              />
            </div>
          </div>

          {/* Purchase price */}
          <div className="space-y-2">
            <Label htmlFor="trainer-price">{t("bikes.purchasePrice")} ({cs})</Label>
            <Input
              id="trainer-price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
            />
          </div>

          {/* Trainer type */}
          <div className="space-y-2">
            <Label>{t("trainer.trainerType")}</Label>
            <div className="space-y-2">
              {TRAINER_TYPE_KEYS.map((key) => (
                <Card
                  key={key}
                  size="sm"
                  className={`cursor-pointer transition-colors ${
                    trainerType === key
                      ? "border-primary/50 bg-primary/5"
                      : "hover:border-border/80"
                  }`}
                  onClick={() => setTrainerType(key)}
                >
                  <CardContent className="flex items-center gap-3 py-3">
                    <div
                      className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
                        trainerType === key
                          ? "border-primary"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {trainerType === key && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t("trainer.types." + key)}</p>
                      <p className="text-xs text-muted-foreground">{t("trainer.typesDescription." + key)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Linked bike */}
          <div className="space-y-2">
            <Label>{t("trainer.linkedOutdoorBike")}</Label>
            {outdoorBikes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("trainer.noBikesHint")}
              </p>
            ) : (
              <>
                <Select value={linkedBikeId} onValueChange={(v) => v && setLinkedBikeId(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("common.none")}</SelectItem>
                    {[...outdoorBikes].sort((a, b) => a.name.localeCompare(b.name)).map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t("trainer.linkedBikeHelp")}
                </p>
              </>
            )}
          </div>

          {/* What wears on the LINKED outdoor bike */}
          {linkedBikeComponents.length > 0 && linkedBikeId !== "none" && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                <Info className="h-3.5 w-3.5" />
                {t("trainer.linkedBikeWearInfo")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {linkedBikeComponents.map(({ label, multiplier }) => (
                  <Badge
                    key={label}
                    variant="secondary"
                    className={`text-[10px] ${
                      multiplier > 1
                        ? "bg-orange-500/10 text-orange-700 border-orange-500/20"
                        : "bg-blue-500/10 text-blue-700 border-blue-500/20"
                    }`}
                  >
                    {label} {multiplier !== 1 && `·${multiplier}×`}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Trainer-hardware components (only what belongs to the trainer unit itself) */}
          <div className="space-y-2">
            <Label>{t("trainer.trainerHardware")}</Label>
            {trainerHardwareTemplate.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4">
                <p className="text-sm text-muted-foreground text-center">
                  {trainerType === "smart_bike"
                    ? t("trainer.smartBikeHint")
                    : t("trainer.noTrainerComponents")}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-lg border divide-y">
                  {trainerHardwareTemplate.map((comp) => {
                    const checked = includedTypes.has(comp.type);
                    const ov = compOverrides[comp.type] ?? defaultOverride(comp, today);
                    const displayName = ov.name || comp.name;
                    const displayThreshold = ov.thresholdDistanceKm
                      ? `${parseFloat(ov.thresholdDistanceKm).toLocaleString()} km`
                      : comp.thresholdDistanceKm
                        ? `${comp.thresholdDistanceKm.toLocaleString()} km`
                        : null;
                    const isCustomDate = ov.installDate && ov.installDate !== today;
                    return (
                      <div
                        key={comp.type}
                        className="flex items-center gap-3 px-3 py-2.5"
                      >
                        <div
                          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                          onClick={() => toggleType(comp.type)}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleType(comp.type)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{displayName}</p>
                            {(ov.brand || isCustomDate) && (
                              <p className="text-xs text-muted-foreground">
                                {[ov.brand, ov.model].filter(Boolean).join(" ")}
                                {isCustomDate && (
                                  <span className={ov.brand ? " · " : ""}>
                                    {t("trainer.installed")} {ov.installDate}
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                          {displayThreshold && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {displayThreshold}
                            </span>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={(e) => { e.stopPropagation(); openEditDialog(comp.type); }}
                          title={t("trainer.editComponentDetails")}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("trainer.trainerComponentsHelp")}
                </p>
              </>
            )}
          </div>
        </div>

        {/* ── Per-component edit dialog ─────────────────────────────────── */}
        <Dialog
          open={editingType !== null}
          onOpenChange={(o) => { if (!o) { setEditingType(null); setEditDraft(null); } }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {t("common.edit")} {editDraft?.name || editingType}
              </DialogTitle>
              <DialogDescription>
                {t("trainer.setInstallDateNote")}
              </DialogDescription>
            </DialogHeader>
            {editDraft && (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="comp-edit-name">{t("common.name")}</Label>
                  <Input
                    id="comp-edit-name"
                    value={editDraft.name}
                    onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="comp-edit-brand">{t("components.brand")}</Label>
                    <Input
                      id="comp-edit-brand"
                      placeholder="e.g., Shimano"
                      value={editDraft.brand}
                      onChange={(e) => setEditDraft({ ...editDraft, brand: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comp-edit-model">{t("components.model")}</Label>
                    <Input
                      id="comp-edit-model"
                      placeholder="e.g., CS-M8100"
                      value={editDraft.model}
                      onChange={(e) => setEditDraft({ ...editDraft, model: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comp-edit-date">{t("components.installDate")}</Label>
                  <DatePicker
                    id="comp-edit-date"
                    value={editDraft.installDate}
                    onChange={(v) => setEditDraft({ ...editDraft, installDate: v })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("trainer.indoorRidesNote")}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="comp-edit-thresh-km">{t("trainer.thresholdKm")}</Label>
                    <Input
                      id="comp-edit-thresh-km"
                      type="number"
                      step="1"
                      placeholder="e.g., 10000"
                      value={editDraft.thresholdDistanceKm}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, thresholdDistanceKm: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comp-edit-thresh-h">{t("trainer.thresholdHours")}</Label>
                    <Input
                      id="comp-edit-thresh-h"
                      type="number"
                      step="1"
                      placeholder="e.g., 400"
                      value={editDraft.thresholdHours}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, thresholdHours: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comp-edit-cost">{t("trainer.purchaseCost", { currency: "€" })}</Label>
                  <Input
                    id="comp-edit-cost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={editDraft.costCents}
                    onChange={(e) => setEditDraft({ ...editDraft, costCents: e.target.value })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setEditingType(null); setEditDraft(null); }}
              >
                {t("common.cancel")}
              </Button>
              <Button onClick={saveEditDraft}>{t("common.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Install-date warning (shown instead of the normal footer) ─── */}
        {showInstallWarning ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-500/30 p-4 space-y-1.5">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <span>⚠️</span> {t("trainer.installDateWarningTitle")}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                {t("trainer.installDateWarningBody", { today })}
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowInstallWarning(false)}
              >
                {t("trainer.goBackAndFix")}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={saving || !name.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("trainer.adding")}
                  </>
                ) : (
                  t("trainer.addAnyway")
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmitIntent} disabled={saving || !name.trim()}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("trainer.adding")}
                </>
              ) : (
                t("trainer.addHomeTrainer")
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
