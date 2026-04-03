"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BIKE_TEMPLATES,
  COMPONENT_LABELS,
  type ComponentTemplate,
} from "@bike-check/shared";
import { useTranslation } from "@/hooks/use-translation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { useCurrency } from "@/lib/use-currency";
import { currencySymbol } from "@/lib/currency";
import {
  Download,
  Settings2,
  CheckCircle2,
  ArrowRight,
  Bike,
  Loader2,
  X,
  Plus,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Pencil,
  Dumbbell,
} from "lucide-react";

type Step = "import" | "configure" | "done";

const STEPS: { key: Step; labelKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "import", labelKey: "onboarding.stepImport", icon: Download },
  { key: "configure", labelKey: "onboarding.stepConfigure", icon: Settings2 },
  { key: "done", labelKey: "onboarding.stepDone", icon: CheckCircle2 },
];

const STEP_INDEX: Record<Step, number> = { import: 0, configure: 1, done: 2 };

// All component types available for adding
const ALL_COMPONENT_TYPES = Object.keys(COMPONENT_LABELS);

interface OnboardingComponent {
  type: string;
  name: string;
  brand?: string;
  model?: string;
  installDate?: string;
  thresholdDistanceKm?: number;
  thresholdHours?: number;
  thresholdDays?: number;
  costCents?: number;
  wearOnIndoor: boolean;
  indoorWearMultiplier: number;
}

interface ImportedBike {
  id?: string;
  stravaGearId?: string;
  name: string;
  type: string;
  isManual?: boolean;
  existsInDb?: boolean;
  isActive?: boolean;
  selected: boolean;
  stravaDistanceMeters?: number;
  installDate?: string;
  components: OnboardingComponent[];
  componentsExpanded?: boolean;
  componentCount: number;
  /** For archived bikes: "reactivate" keeps existing km/components, "replace" starts fresh */
  archivedAction?: "reactivate" | "replace";
}

const BIKE_TYPE_KEYS = ["road", "gravel", "mountain", "commuter", "other"] as const;

function templateToComponents(bikeType: string): OnboardingComponent[] {
  const template = BIKE_TEMPLATES[bikeType] ?? BIKE_TEMPLATES.road;
  return template.map((t: ComponentTemplate) => ({
    type: t.type,
    name: t.name,
    thresholdDistanceKm: t.thresholdDistanceKm,
    thresholdHours: t.thresholdHours,
    thresholdDays: t.thresholdDays,
    wearOnIndoor: t.wearOnIndoor,
    indoorWearMultiplier: t.indoorWearMultiplier,
  }));
}

export default function OnboardingPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currency = useCurrency();
  const cs = currencySymbol(currency);

  const [step, setStep] = useState<Step>("import");
  const [bikes, setBikes] = useState<ImportedBike[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reimportDialogOpen, setReimportDialogOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any>(null);

  // Manual bike form state
  const [manualName, setManualName] = useState("");
  const [manualType, setManualType] = useState("road");
  const [manualKm, setManualKm] = useState("");

  // Add component dialog state
  const [addCompOpen, setAddCompOpen] = useState(false);
  const [addCompBikeIndex, setAddCompBikeIndex] = useState(0);
  const [addCompType, setAddCompType] = useState("");
  const [addCompName, setAddCompName] = useState("");
  const [addCompBrand, setAddCompBrand] = useState("");
  const [addCompModel, setAddCompModel] = useState("");
  const [addCompDate, setAddCompDate] = useState("");
  const [addCompKm, setAddCompKm] = useState("");
  const [addCompHours, setAddCompHours] = useState("");
  const [addCompDays, setAddCompDays] = useState("");
  const [addCompCost, setAddCompCost] = useState("");

  // Edit component dialog state
  const [editCompOpen, setEditCompOpen] = useState(false);
  const [editCompBikeIndex, setEditCompBikeIndex] = useState(0);
  const [editCompIndex, setEditCompIndex] = useState(0);
  const [editCompName, setEditCompName] = useState("");
  const [editCompBrand, setEditCompBrand] = useState("");
  const [editCompModel, setEditCompModel] = useState("");
  const [editCompDate, setEditCompDate] = useState("");
  const [editCompKm, setEditCompKm] = useState("");
  const [editCompHours, setEditCompHours] = useState("");
  const [editCompDays, setEditCompDays] = useState("");
  const [editCompCost, setEditCompCost] = useState("");

  // Check for ?mode=strava query param — auto-import from Strava
  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "strava") {
      handleImportBikes();
    }
  }, []);

  function applyImportData(stravaBikes: any[], includeAlreadyConfigured: boolean) {
    const bikesToShow = includeAlreadyConfigured
      ? stravaBikes
      : stravaBikes.filter((b: any) => !(b.isActive && b.componentCount > 0));

    if (bikesToShow.length === 0) {
      setError(t("onboarding.allBikesConfigured"));
      return;
    }

    setBikes(
      bikesToShow.map((b: any) => ({
        id: b.id,
        stravaGearId: b.stravaGearId,
        name: b.name,
        type: "road",
        existsInDb: b.existsInDb ?? false,
        isActive: b.isActive ?? false,
        archivedAction: (b.existsInDb && !b.isActive) ? "reactivate" : undefined,
        selected: true,
        stravaDistanceMeters: b.distance ?? 0,
        installDate: b.firstActivityDate ?? new Date().toISOString().split("T")[0],
        components: templateToComponents("road"),
        componentsExpanded: false,
        componentCount: b.componentCount ?? 0,
      }))
    );
    setStep("configure");
  }

  async function handleImportBikes() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bikes/import", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to import bikes");
      }
      const data = await res.json();
      const allBikes = data.bikes;

      const alreadyConfigured = allBikes.filter((b: any) => b.isActive && b.componentCount > 0);
      const newBikes = allBikes.filter((b: any) => !(b.isActive && b.componentCount > 0));

      if (newBikes.length > 0) {
        applyImportData(allBikes, false);
      } else if (alreadyConfigured.length > 0) {
        setPendingImportData(allBikes);
        setReimportDialogOpen(true);
      } else {
        applyImportData(allBikes, false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleConfirmReimport() {
    setReimportDialogOpen(false);
    if (pendingImportData) {
      applyImportData(pendingImportData, true);
      setPendingImportData(null);
    }
  }

  function handleCancelReimport() {
    setReimportDialogOpen(false);
    setPendingImportData(null);
    router.push("/dashboard");
  }

  function handleAddManualBike() {
    if (!manualName.trim()) return;
    const bikeType = manualType;
    const km = parseFloat(manualKm) || 0;
    setBikes((prev) => [
      ...prev,
      {
        name: manualName.trim(),
        type: bikeType,
        isManual: true,
        selected: true,
        stravaDistanceMeters: km * 1000,
        installDate: new Date().toISOString().split("T")[0],
        components: templateToComponents(bikeType),
        componentsExpanded: false,
        componentCount: 0,
      },
    ]);
    setManualName("");
    setManualType("road");
    setManualKm("");
    setStep("configure");
  }

  function updateBike(index: number, updates: Partial<ImportedBike>) {
    const updated = [...bikes];
    updated[index] = { ...updated[index], ...updates };
    setBikes(updated);
  }

  function updateComponent(bikeIndex: number, compIndex: number, updates: Partial<OnboardingComponent>) {
    const updated = [...bikes];
    const comps = [...updated[bikeIndex].components];
    comps[compIndex] = { ...comps[compIndex], ...updates };
    updated[bikeIndex] = { ...updated[bikeIndex], components: comps };
    setBikes(updated);
  }

  function removeComponent(bikeIndex: number, compIndex: number) {
    const updated = [...bikes];
    const comps = [...updated[bikeIndex].components];
    comps.splice(compIndex, 1);
    updated[bikeIndex] = { ...updated[bikeIndex], components: comps };
    setBikes(updated);
  }

  function openAddComponentDialog(bikeIndex: number) {
    setAddCompBikeIndex(bikeIndex);
    setAddCompType("");
    setAddCompName("");
    setAddCompBrand("");
    setAddCompModel("");
    setAddCompDate(bikes[bikeIndex]?.installDate ?? new Date().toISOString().split("T")[0]);
    setAddCompKm("");
    setAddCompHours("");
    setAddCompDays("");
    setAddCompCost("");
    setAddCompOpen(true);
  }

  function handleAddCompTypeChange(value: string | null) {
    if (!value) return;
    setAddCompType(value);
    setAddCompName(t("components.labels." + value));
    const bikeType = bikes[addCompBikeIndex]?.type ?? "road";
    const template = BIKE_TEMPLATES[bikeType] ?? BIKE_TEMPLATES.road;
    const tmpl = template.find((t: ComponentTemplate) => t.type === value);
    if (tmpl) {
      setAddCompKm(tmpl.thresholdDistanceKm?.toString() ?? "");
      setAddCompHours(tmpl.thresholdHours?.toString() ?? "");
      setAddCompDays(tmpl.thresholdDays?.toString() ?? "");
    } else {
      setAddCompKm("");
      setAddCompHours("");
      setAddCompDays("");
    }
  }

  function handleAddCompSubmit() {
    if (!addCompType || !addCompName) return;
    const km = parseFloat(addCompKm);
    const hrs = parseFloat(addCompHours);
    const days = parseInt(addCompDays);
    const cost = parseFloat(addCompCost);

    const updated = [...bikes];
    const comps = [...updated[addCompBikeIndex].components];
    comps.push({
      type: addCompType,
      name: addCompName,
      brand: addCompBrand || undefined,
      model: addCompModel || undefined,
      installDate: addCompDate || undefined,
      thresholdDistanceKm: !isNaN(km) && km > 0 ? km : undefined,
      thresholdHours: !isNaN(hrs) && hrs > 0 ? hrs : undefined,
      thresholdDays: !isNaN(days) && days > 0 ? days : undefined,
      costCents: !isNaN(cost) && cost > 0 ? Math.round(cost * 100) : undefined,
      wearOnIndoor: true,
      indoorWearMultiplier: 1.0,
    });
    updated[addCompBikeIndex] = { ...updated[addCompBikeIndex], components: comps };
    setBikes(updated);
    setAddCompOpen(false);
  }

  function openEditComponentDialog(bikeIndex: number, compIndex: number) {
    const comp = bikes[bikeIndex].components[compIndex];
    const bikeDate = bikes[bikeIndex]?.installDate ?? new Date().toISOString().split("T")[0];
    setEditCompBikeIndex(bikeIndex);
    setEditCompIndex(compIndex);
    setEditCompName(comp.name);
    setEditCompBrand(comp.brand ?? "");
    setEditCompModel(comp.model ?? "");
    setEditCompDate(comp.installDate ?? bikeDate);
    setEditCompKm(comp.thresholdDistanceKm?.toString() ?? "");
    setEditCompHours(comp.thresholdHours?.toString() ?? "");
    setEditCompDays(comp.thresholdDays?.toString() ?? "");
    setEditCompCost(comp.costCents ? (comp.costCents / 100).toFixed(2) : "");
    setEditCompOpen(true);
  }

  function handleEditCompSubmit() {
    const km = parseFloat(editCompKm);
    const hrs = parseFloat(editCompHours);
    const days = parseInt(editCompDays);
    const cost = parseFloat(editCompCost);

    updateComponent(editCompBikeIndex, editCompIndex, {
      name: editCompName,
      brand: editCompBrand || undefined,
      model: editCompModel || undefined,
      installDate: editCompDate || undefined,
      thresholdDistanceKm: !isNaN(km) && km > 0 ? km : undefined,
      thresholdHours: !isNaN(hrs) && hrs > 0 ? hrs : undefined,
      thresholdDays: !isNaN(days) && days > 0 ? days : undefined,
      costCents: !isNaN(cost) && cost > 0 ? Math.round(cost * 100) : undefined,
    });
    setEditCompOpen(false);
  }

  function addComponent(bikeIndex: number, type: string) {
    const updated = [...bikes];
    const comps = [...updated[bikeIndex].components];
    const template = BIKE_TEMPLATES[updated[bikeIndex].type] ?? BIKE_TEMPLATES.road;
    const templateComp = template.find((t: ComponentTemplate) => t.type === type);
    comps.push({
      type,
      name: t("components.labels." + type),
      thresholdDistanceKm: templateComp?.thresholdDistanceKm,
      thresholdHours: templateComp?.thresholdHours,
      thresholdDays: templateComp?.thresholdDays,
      wearOnIndoor: templateComp?.wearOnIndoor ?? true,
      indoorWearMultiplier: templateComp?.indoorWearMultiplier ?? 1.0,
    });
    updated[bikeIndex] = { ...updated[bikeIndex], components: comps };
    setBikes(updated);
  }

  async function handleConfigureBikes() {
    setLoading(true);
    setError(null);
    try {
      const selectedBikes = bikes.filter((b) => b.selected);
      const unselectedBikes = bikes.filter((b) => !b.selected);

      // Deactivate unselected bikes that exist in DB
      for (const bike of unselectedBikes) {
        if (bike.id) {
          await fetch(`/api/bikes/${bike.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: false }),
          });
        }
      }

      // Configure selected bikes
      for (const bike of selectedBikes) {
        let bikeId = bike.id;

        // Archived bike being reactivated — just set isActive, keep components/km
        if (bikeId && bike.archivedAction === "reactivate") {
          await fetch(`/api/bikes/${bikeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: true }),
          });
          continue;
        }

        if (!bikeId) {
          const createBody: Record<string, unknown> = {
            name: bike.name,
            type: bike.type,
            applyTemplate: false,
          };
          if (bike.stravaGearId) {
            createBody.stravaGearId = bike.stravaGearId;
          }
          const createRes = await fetch("/api/bikes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(createBody),
          });
          if (!createRes.ok) throw new Error(`Failed to create bike ${bike.name}`);
          const created = await createRes.json();
          bikeId = created.id;
        } else {
          const patchRes = await fetch(`/api/bikes/${bikeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: bike.type, isActive: true }),
          });
          if (!patchRes.ok) throw new Error(`Failed to update bike ${bike.name}`);

          // Delete existing components before recreating (fresh start)
          const existingRes = await fetch(`/api/bikes/${bikeId}/components`);
          if (existingRes.ok) {
            const existingComponents = await existingRes.json();
            for (const comp of existingComponents) {
              await fetch(`/api/components/${comp.id}`, { method: "DELETE" });
            }
          }
        }

        // Create components — initialize with the bike's total Strava distance.
        // This is the base odometer reading. Indoor trainer wear is added on top
        // when a trainer is linked via recalculate.
        const stravaDistanceKm = (bike.stravaDistanceMeters ?? 0) / 1000;
        for (const comp of bike.components) {
          await fetch(`/api/bikes/${bikeId}/components`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: comp.type,
              name: comp.name,
              brand: comp.brand || undefined,
              model: comp.model || undefined,
              installDate: comp.installDate ?? bike.installDate ?? new Date().toISOString().split("T")[0],
              thresholdDistanceKm: comp.thresholdDistanceKm,
              thresholdHours: comp.thresholdHours,
              thresholdDays: comp.thresholdDays,
              costCents: comp.costCents || undefined,
              wearOnIndoor: comp.wearOnIndoor,
              indoorWearMultiplier: comp.indoorWearMultiplier,
              currentDistanceKm: stravaDistanceKm,
            }),
          });
        }
      }

      // Sync ride history from Strava but skip wear application — the
      // components already have the correct base km from Strava's total.
      // This populates ride_logs for deduplication so future syncs don't
      // re-process these rides.
      const installDates = selectedBikes
        .map((b) => b.installDate ?? new Date().toISOString().split("T")[0])
        .filter(Boolean);
      const earliestDate = installDates.length > 0
        ? installDates.reduce((a, b) => (a < b ? a : b))
        : new Date().toISOString().split("T")[0];
      const afterEpoch = Math.floor(new Date(earliestDate).getTime() / 1000);

      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ after: afterEpoch, skipWear: true }),
      }).catch(() => {});

      setStep("done");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const selectedBikes = bikes.filter((b) => b.selected);
  const currentStepIndex = STEP_INDEX[step];

  return (
    <div className="mx-auto max-w-xl">
      {/* Re-import confirmation dialog */}
      <Dialog open={reimportDialogOpen} onOpenChange={setReimportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {t("onboarding.bikesAlreadyConfigured")}
            </DialogTitle>
            <DialogDescription>
              {pendingImportData && (() => {
                const withComps = pendingImportData.filter((b: any) => b.componentCount > 0);
                return (
                  <>
                    {withComps.map((b: any) => b.name).join(", ")}{" "}
                    {withComps.length === 1 ? t("onboarding.reimportWarningHas") : t("onboarding.reimportWarningHave")}{" "}
                    {t("onboarding.reimportWarning")}
                  </>
                );
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelReimport}>
              {t("onboarding.goToDashboard")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmReimport}>
              {t("onboarding.reimportAndReplace")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add component dialog */}
      <Dialog open={addCompOpen} onOpenChange={setAddCompOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("onboarding.addComponentTitle")}</DialogTitle>
            <DialogDescription>{t("onboarding.addComponentDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("onboarding.componentType")}</Label>
              <Select value={addCompType} onValueChange={handleAddCompTypeChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("onboarding.selectTypePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {ALL_COMPONENT_TYPES
                    .filter((ct) => !bikes[addCompBikeIndex]?.components.some((c) => c.type === ct))
                    .sort((a, b) => t("components.labels." + a).localeCompare(t("components.labels." + b)))
                    .map((type) => (
                      <SelectItem key={type} value={type}>{t("components.labels." + type)}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("common.name")}</Label>
              <Input value={addCompName} onChange={(e) => setAddCompName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("components.installDate")}</Label>
              <DatePicker value={addCompDate} onChange={setAddCompDate} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("components.brand")}</Label>
                <Input placeholder="e.g., Shimano" value={addCompBrand} onChange={(e) => setAddCompBrand(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("components.model")}</Label>
                <Input placeholder="e.g., CN-HG701" value={addCompModel} onChange={(e) => setAddCompModel(e.target.value)} />
              </div>
            </div>
            <p className="text-xs font-medium text-muted-foreground pt-1">{t("onboarding.replacementThresholds")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("onboarding.distanceKm")}</Label>
                <Input type="number" placeholder="e.g. 3000" value={addCompKm} onChange={(e) => setAddCompKm(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("onboarding.hours")}</Label>
                <Input type="number" placeholder="e.g. 200" value={addCompHours} onChange={(e) => setAddCompHours(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("onboarding.days")}</Label>
                <Input type="number" placeholder="e.g. 365" value={addCompDays} onChange={(e) => setAddCompDays(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("components.cost")} ({cs})</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={addCompCost} onChange={(e) => setAddCompCost(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCompOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAddCompSubmit} disabled={!addCompType || !addCompName}>
              {t("onboarding.addComponentTitle")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit component dialog */}
      <Dialog open={editCompOpen} onOpenChange={setEditCompOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("onboarding.editComponentTitle", { name: editCompName || "component" })}</DialogTitle>
            <DialogDescription>{t("onboarding.editComponentDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("common.name")}</Label>
              <Input value={editCompName} onChange={(e) => setEditCompName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("components.installDate")}</Label>
              <DatePicker value={editCompDate} onChange={setEditCompDate} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("components.brand")}</Label>
                <Input placeholder="e.g., Shimano" value={editCompBrand} onChange={(e) => setEditCompBrand(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("components.model")}</Label>
                <Input placeholder="e.g., CN-HG701" value={editCompModel} onChange={(e) => setEditCompModel(e.target.value)} />
              </div>
            </div>
            <p className="text-xs font-medium text-muted-foreground pt-1">{t("onboarding.replacementThresholds")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("onboarding.distanceKm")}</Label>
                <Input type="number" placeholder="e.g. 3000" value={editCompKm} onChange={(e) => setEditCompKm(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("onboarding.hours")}</Label>
                <Input type="number" placeholder="e.g. 200" value={editCompHours} onChange={(e) => setEditCompHours(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("onboarding.days")}</Label>
                <Input type="number" placeholder="e.g. 365" value={editCompDays} onChange={(e) => setEditCompDays(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("components.cost")} ({cs})</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={editCompCost} onChange={(e) => setEditCompCost(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCompOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleEditCompSubmit} disabled={!editCompName}>
              {t("common.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map(({ key, labelKey, icon: Icon }, i) => (
          <div key={key} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-px w-8 ${i <= currentStepIndex ? "bg-primary" : "bg-border"}`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors ${
                  i < currentStepIndex
                    ? "bg-primary text-primary-foreground"
                    : i === currentStepIndex
                      ? "bg-primary/10 text-primary ring-2 ring-primary/30"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i < currentStepIndex ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </div>
              <span
                className={`hidden text-xs font-medium sm:inline ${
                  i === currentStepIndex ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {t(labelKey)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {step === "import" && t("onboarding.setupTitle")}
          {step === "configure" && t("onboarding.configureTitle")}
          {step === "done" && t("onboarding.doneTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === "import" && t("onboarding.setupDescription")}
          {step === "configure" && t("onboarding.configureDescription")}
          {step === "done" && t("onboarding.doneDescription")}
        </p>
      </div>

      {error && (
        <Card className="mb-6 border-red-500/20">
          <CardContent className="text-sm text-red-600">{error}</CardContent>
        </Card>
      )}

      {/* Step 1: Import */}
      {step === "import" && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              className="flex flex-col items-center gap-3 rounded-xl border border-border p-6 transition-colors hover:border-primary/50 hover:bg-primary/5"
              onClick={handleImportBikes}
              disabled={loading}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10">
                <Download className="h-7 w-7 text-orange-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{t("onboarding.fromStrava")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("onboarding.fromStravaDescription")}
                </p>
              </div>
            </button>
            <button
              type="button"
              className="flex flex-col items-center gap-3 rounded-xl border border-border p-6 transition-colors hover:border-primary/50 hover:bg-primary/5"
              onClick={() => setStep("configure")}
              disabled={loading}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Plus className="h-7 w-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{t("onboarding.manual")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("onboarding.manualDescription")}
                </p>
              </div>
            </button>
          </div>
          {loading && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("onboarding.importingFromStrava")}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Configure */}
      {step === "configure" && (
        <div className="space-y-3">
          {bikes.map((bike, i) => {
            const availableTypes = ALL_COMPONENT_TYPES.filter(
              (t) => !bike.components.some((c) => c.type === t)
            );
            return (
              <Card key={bike.stravaGearId ?? `manual-${i}`} size="sm">
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={bike.selected}
                      onCheckedChange={(checked) => updateBike(i, { selected: checked === true })}
                    />
                    <Bike className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{bike.name}</span>
                      {(bike.stravaDistanceMeters ?? 0) > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {Math.round((bike.stravaDistanceMeters ?? 0) / 1000).toLocaleString()} {t("onboarding.kmOnStrava")}
                        </span>
                      )}
                    </div>
                    {bike.existsInDb && !bike.isActive && (
                      <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/20">
                        {t("onboarding.archived")}
                      </Badge>
                    )}
                    {bike.isManual && (
                      <Badge variant="secondary" className="text-[10px]">{t("onboarding.manual")}</Badge>
                    )}
                  </div>
                  {/* Archived bike: ask user to reactivate or replace */}
                  {bike.selected && bike.existsInDb && !bike.isActive && (
                    <div className="mt-3 ml-10 rounded-lg border border-amber-400/30 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                        {t("onboarding.previouslyRemoved")}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                            bike.archivedAction === "reactivate"
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => updateBike(i, { archivedAction: "reactivate" })}
                        >
                          {t("onboarding.reactivate")}
                          <span className="block font-normal text-muted-foreground mt-0.5">
                            {t("onboarding.reactivateDescription")}
                          </span>
                        </button>
                        <button
                          type="button"
                          className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                            bike.archivedAction === "replace"
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => updateBike(i, { archivedAction: "replace" })}
                        >
                          {t("onboarding.startFresh")}
                          <span className="block font-normal text-muted-foreground mt-0.5">
                            {t("onboarding.startFreshDescription")}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                  {bike.selected && (!bike.existsInDb || bike.isActive || bike.archivedAction === "replace") && (
                    <div className="mt-3 ml-10 space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{t("onboarding.bikeType")}</label>
                        <Select
                          value={bike.type}
                          onValueChange={(value) => {
                            if (!value) return;
                            updateBike(i, { type: value, components: templateToComponents(value) });
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BIKE_TYPE_KEYS.map((key) => (
                              <SelectItem key={key} value={key}>{t("bikes.bikeTypes." + key)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">
                            {t("components.installDate")}
                          </Label>
                          <DatePicker
                            value={bike.installDate ?? new Date().toISOString().split("T")[0]}
                            onChange={(v) => updateBike(i, { installDate: v })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">
                            {t("onboarding.totalKm")}
                          </Label>
                          <Input
                            type="number"
                            step="1"
                            placeholder="0"
                            value={Math.round((bike.stravaDistanceMeters ?? 0) / 1000) || ""}
                            onChange={(e) => {
                              const km = parseFloat(e.target.value) || 0;
                              updateBike(i, { stravaDistanceMeters: km * 1000 });
                            }}
                            className="h-9"
                          />
                        </div>
                      </div>
                      <div>
                        <button
                          type="button"
                          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => updateBike(i, { componentsExpanded: !bike.componentsExpanded })}
                        >
                          {bike.componentsExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                          {t("bikes.components")} ({bike.components.length})
                        </button>
                        {bike.componentsExpanded ? (
                          <div className="mt-2 space-y-1.5">
                            {bike.components.map((comp, ci) => (
                              <div key={comp.type} className="flex items-center gap-2">
                                <span className="flex-1 min-w-0 text-xs truncate">
                                  {comp.name}
                                  {comp.thresholdDistanceKm && (
                                    <span className="text-muted-foreground ml-1">
                                      ({comp.thresholdDistanceKm.toLocaleString()} km)
                                    </span>
                                  )}
                                </span>
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-primary"
                                  onClick={() => openEditComponentDialog(i, ci)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-red-500"
                                  onClick={() => removeComponent(i, ci)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                            {availableTypes.length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs w-full"
                                onClick={() => openAddComponentDialog(i)}
                              >
                                <Plus className="h-3 w-3" />
                                {t("bikes.addComponent")}
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {bike.components.map((comp) => (
                              <Badge key={comp.type} variant="outline" className="text-[10px]">
                                {t("components.labels." + comp.type)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Add a manual bike */}
          <Card size="sm" className="border-dashed">
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <Input
                    placeholder={t("onboarding.addManualBikePlaceholder")}
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="h-9"
                  />
                </div>
                <Input
                  type="number"
                  placeholder="km"
                  value={manualKm}
                  onChange={(e) => setManualKm(e.target.value)}
                  className="h-9 w-24"
                />
                <Select value={manualType} onValueChange={(v) => v && setManualType(v)}>
                  <SelectTrigger className="h-9 w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BIKE_TYPE_KEYS.map((key) => (
                      <SelectItem key={key} value={key}>{t("bikes.bikeTypes." + key)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={handleAddManualBike} disabled={!manualName.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleConfigureBikes}
            disabled={loading || selectedBikes.length === 0}
            className="mt-4 w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("onboarding.settingUp")}
              </>
            ) : (
              <>
                {selectedBikes.length !== 1
                  ? t("onboarding.continueWithPlural", { count: String(selectedBikes.length) })
                  : t("onboarding.continueWith", { count: String(selectedBikes.length) })}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* Step 3: Done */}
      {step === "done" && (
        <div className="mt-8 flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <p className="mt-6 text-sm text-muted-foreground max-w-sm">
            {t("onboarding.bikesSetUp")}
          </p>

          {/* Home trainer hint */}
          <div className="mt-6 w-full rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                <Dumbbell className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{t("onboarding.rideIndoors")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("onboarding.addTrainerHint")}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex w-full gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="flex-1"
            >
              {t("onboarding.goToDashboard")}
            </Button>
            <Button
              onClick={() => router.push("/bikes?highlight=trainer")}
              className="flex-1"
            >
              <Dumbbell className="h-4 w-4" />
              {t("trainer.addHomeTrainer")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
