"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2 } from "lucide-react";
import { useCurrency } from "@/lib/use-currency";
import { currencySymbol } from "@/lib/currency";
import { useTranslation } from "@/hooks/use-translation";

const QUICK_TITLE_KEYS = [
  "annualService",
  "bikeRevision",
  "brakeAdjustment",
  "gearTuning",
  "generalCheck",
  "wheelTruing",
] as const;

export function AddMaintenanceDialog({
  bikeId,
  onAdded,
}: {
  bikeId: string;
  onAdded: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dateStr, setDateStr] = useState(new Date().toISOString().slice(0, 10));
  const [costStr, setCostStr] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const currency = useCurrency();
  const cs = currencySymbol(currency);

  function reset() {
    setTitle("");
    setDateStr(new Date().toISOString().slice(0, 10));
    setCostStr("");
    setNotes("");
  }

  async function handleSubmit() {
    if (!title.trim() || !dateStr) return;
    setSaving(true);
    const costCents = costStr ? Math.round(parseFloat(costStr) * 100) : undefined;
    await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bikeId,
        title: title.trim(),
        date: dateStr,
        costCents: costCents && costCents > 0 ? costCents : undefined,
        notes: notes.trim() || undefined,
      }),
    });
    setSaving(false);
    setOpen(false);
    reset();
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Plus className="h-4 w-4 mr-1" />
        {t("maintenance.logMaintenance")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("maintenance.logMaintenance")}</DialogTitle>
          <DialogDescription>
            {t("maintenance.logDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick-select chips */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              {t("maintenance.titleField")}
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TITLE_KEYS.map((key) => {
                const label = t("maintenance.quickTitles." + key);
                return (
                  <Badge
                    key={key}
                    variant={title === label ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => setTitle(title === label ? "" : label)}
                  >
                    {label}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="maint-title">{t("maintenance.titleField")}</Label>
            <Input
              id="maint-title"
              placeholder="e.g. General bike check at the shop"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            />
          </div>

          {/* Date + Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("maintenance.date")}</Label>
              <DatePicker value={dateStr} onChange={setDateStr} />
            </div>
            <div>
              <Label htmlFor="maint-cost">{t("maintenance.cost")} ({cs})</Label>
              <Input
                id="maint-cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={costStr}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCostStr(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="maint-notes">{t("maintenance.notesField")}</Label>
            <textarea
              id="maint-notes"
              className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Any details about the maintenance..."
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !title.trim() || !dateStr}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
