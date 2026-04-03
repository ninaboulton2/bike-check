"use client";

import { useState } from "react";
import { COMPONENT_LABELS, BIKE_TEMPLATES } from "@bike-check/shared";
import { useTranslation } from "@/hooks/use-translation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useCurrency } from "@/lib/use-currency";
import { currencySymbol } from "@/lib/currency";

export function AddComponentDialog({
  bikeId,
  bikeType,
  onAdded,
}: {
  bikeId: string;
  bikeType: string;
  onAdded: () => void;
}) {
  const { t } = useTranslation();
  const currency = useCurrency();
  const cs = currencySymbol(currency);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [installDate, setInstallDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [thresholdKm, setThresholdKm] = useState("");
  const [thresholdHours, setThresholdHours] = useState("");
  const [thresholdDays, setThresholdDays] = useState("");
  const [cost, setCost] = useState("");
  const [batteryTracking, setBatteryTracking] = useState(false);
  const [batteryLifeHours, setBatteryLifeHours] = useState("");
  const [careTracking, setCareTracking] = useState(false);
  const [careIntervalKm, setCareIntervalKm] = useState("");
  const [careIntervalHours, setCareIntervalHours] = useState("");

  function handleTypeChange(value: string | null) {
    if (!value) return;
    setType(value);
    setName(t("components.labels." + value) || value);
    // Pre-fill thresholds from template
    const template = BIKE_TEMPLATES[bikeType] ?? BIKE_TEMPLATES.road;
    const tmpl = template.find((t: any) => t.type === value);
    if (tmpl) {
      setThresholdKm(tmpl.thresholdDistanceKm?.toString() ?? "");
      setThresholdHours(tmpl.thresholdHours?.toString() ?? "");
      setThresholdDays(tmpl.thresholdDays?.toString() ?? "");
    } else {
      setThresholdKm("");
      setThresholdHours("");
      setThresholdDays("");
    }
  }

  async function handleSubmit() {
    if (!type || !name) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        type,
        name,
        installDate,
        wearOnIndoor: true,
        indoorWearMultiplier: 1.0,
      };
      if (brand) body.brand = brand;
      if (model) body.model = model;
      const km = parseFloat(thresholdKm);
      if (!isNaN(km) && km > 0) body.thresholdDistanceKm = km;
      const hrs = parseFloat(thresholdHours);
      if (!isNaN(hrs) && hrs > 0) body.thresholdHours = hrs;
      const days = parseInt(thresholdDays);
      if (!isNaN(days) && days > 0) body.thresholdDays = days;
      const c = parseFloat(cost);
      if (!isNaN(c) && c > 0) body.costCents = Math.round(c * 100);
      if (batteryTracking) {
        body.batteryTracking = true;
        const bh = parseFloat(batteryLifeHours);
        if (!isNaN(bh) && bh > 0) body.batteryLifeHours = bh;
      }
      if (careTracking) {
        body.careTracking = true;
        const ckm = parseFloat(careIntervalKm);
        if (!isNaN(ckm) && ckm > 0) body.careIntervalKm = ckm;
        const ch = parseFloat(careIntervalHours);
        if (!isNaN(ch) && ch > 0) body.careIntervalHours = ch;
      }

      await fetch(`/api/bikes/${bikeId}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setOpen(false);
      resetForm();
      onAdded();
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setType("");
    setName("");
    setBrand("");
    setModel("");
    setInstallDate(new Date().toISOString().split("T")[0]);
    setThresholdKm("");
    setThresholdHours("");
    setThresholdDays("");
    setCost("");
    setBatteryTracking(false);
    setBatteryLifeHours("");
    setCareTracking(false);
    setCareIntervalKm("");
    setCareIntervalHours("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Plus className="h-4 w-4" />
        {t("components.addTitle")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("components.addTitle")}</DialogTitle>
          <DialogDescription>{t("components.addDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("components.selectType")}</Label>
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t("components.selectType")} />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(COMPONENT_LABELS).sort((a, b) => t("components.labels." + a).localeCompare(t("components.labels." + b))).map((value) => (
                  <SelectItem key={value} value={value}>{t("components.labels." + value)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-name">{t("common.name")}</Label>
            <Input id="add-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="add-brand">{t("components.brand")}</Label>
              <Input id="add-brand" placeholder="e.g., Shimano" value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-model">{t("components.model")}</Label>
              <Input id="add-model" placeholder="e.g., CN-HG701" value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-date">{t("components.installDate")}</Label>
            <DatePicker id="add-date" value={installDate} onChange={setInstallDate} />
          </div>
          <p className="text-xs font-medium text-muted-foreground pt-1">{t("components.thresholdKm")}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="add-km">{t("components.thresholdKm")}</Label>
              <Input id="add-km" type="number" placeholder="e.g. 3000" value={thresholdKm} onChange={(e) => setThresholdKm(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-hours">{t("components.thresholdHours")}</Label>
              <Input id="add-hours" type="number" placeholder="e.g. 200" value={thresholdHours} onChange={(e) => setThresholdHours(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-days">{t("components.thresholdDays")}</Label>
              <Input id="add-days" type="number" placeholder="e.g. 365" value={thresholdDays} onChange={(e) => setThresholdDays(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-cost">{t("components.cost")} ({cs})</Label>
              <Input id="add-cost" type="number" step="0.01" placeholder="0.00" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">{t("components.batteryTracking")}</Label>
              <p className="text-xs text-muted-foreground">{t("components.batteryTrackingDescription")}</p>
            </div>
            <Switch checked={batteryTracking} onCheckedChange={setBatteryTracking} />
          </div>
          {batteryTracking && (
            <div className="space-y-2">
              <Label htmlFor="add-battery-hours">{t("components.batteryLife")}</Label>
              <Input
                id="add-battery-hours"
                type="number"
                step="1"
                placeholder="e.g., 60"
                value={batteryLifeHours}
                onChange={(e) => setBatteryLifeHours(e.target.value)}
              />
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">{t("components.careTracking")}</Label>
              <p className="text-xs text-muted-foreground">{t("components.careTrackingDescription")}</p>
            </div>
            <Switch checked={careTracking} onCheckedChange={setCareTracking} />
          </div>
          {careTracking && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="add-care-km">{t("components.careIntervalKm")}</Label>
                <Input id="add-care-km" type="number" step="1" placeholder="e.g., 200" value={careIntervalKm} onChange={(e) => setCareIntervalKm(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-care-hours">{t("components.careIntervalHours")}</Label>
                <Input id="add-care-hours" type="number" step="1" placeholder="e.g., 40" value={careIntervalHours} onChange={(e) => setCareIntervalHours(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
          <Button
            onClick={handleSubmit}
            disabled={
              saving ||
              !type ||
              !name ||
              (batteryTracking && (!batteryLifeHours || parseFloat(batteryLifeHours) <= 0)) ||
              (careTracking && (!careIntervalKm || parseFloat(careIntervalKm) <= 0) && (!careIntervalHours || parseFloat(careIntervalHours) <= 0))
            }
          >
            {saving ? t("common.saving") : t("components.addTitle")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
