"use client";

import { useEffect, useState } from "react";
import {
  TRAINER_WEAR_MATRIX,
} from "@bike-check/shared";
import { useTranslation } from "@/hooks/use-translation";
import { useCurrency } from "@/lib/use-currency";
import { currencySymbol } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Loader2, Info } from "lucide-react";

const TRAINER_TYPE_KEYS = ["direct_drive", "wheel_on", "rollers", "smart_bike"] as const;

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
  /** Current trainer data */
  trainer: {
    id: string;
    name: string;
    linkedBikeId: string | null;
    installDate: string;
    purchasePriceCents?: number | null;
  };
  onSaved: () => void;
  /** Called when linked bike changed — navigates to dashboard with syncing state */
  onSyncing: (bikeId: string) => void;
}

export function EditHomeTrainerDialog({ open, onOpenChange, outdoorBikes, trainer, onSaved, onSyncing }: Props) {
  const { t } = useTranslation();
  const currency = useCurrency();
  const cs = currencySymbol(currency);
  const [name, setName] = useState(trainer.name);
  const [purchasePrice, setPurchasePrice] = useState(trainer.purchasePriceCents ? (trainer.purchasePriceCents / 100).toString() : "");
  const [trainerType, setTrainerType] = useState("direct_drive");
  const [linkedBikeId, setLinkedBikeId] = useState<string>(trainer.linkedBikeId ?? "none");
  const [installDate, setInstallDate] = useState(trainer.installDate);
  const [saving, setSaving] = useState(false);

  // Fetch current trainer type from user settings
  useEffect(() => {
    if (open) {
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((user) => {
          if (user.trainerType) setTrainerType(user.trainerType);
        })
        .catch(() => {});
    }
  }, [open]);

  // Reset fields when trainer prop changes or dialog reopens
  useEffect(() => {
    if (open) {
      setName(trainer.name);
      setLinkedBikeId(trainer.linkedBikeId ?? "none");
      setInstallDate(trainer.installDate);
      setPurchasePrice(trainer.purchasePriceCents ? (trainer.purchasePriceCents / 100).toString() : "");
    }
  }, [open, trainer]);

  const linkedBikeComponents = linkedBikeWearInfo(trainerType, t);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      // Update trainer type in user settings
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainerType }),
      });

      const newLinkedBikeId = linkedBikeId === "none" ? null : linkedBikeId;
      const oldLinkedBikeId = trainer.linkedBikeId;

      // Update the trainer bike
      await fetch(`/api/bikes/${trainer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          linkedBikeId: newLinkedBikeId,
          purchasePriceCents: purchasePrice && parseFloat(purchasePrice) > 0 ? Math.round(parseFloat(purchasePrice) * 100) : null,
        }),
      });

      // If install date changed, update all trainer components' install dates
      if (installDate !== trainer.installDate) {
        const bikeRes = await fetch(`/api/bikes/${trainer.id}`);
        if (bikeRes.ok) {
          const bikeData = await bikeRes.json();
          for (const comp of (bikeData.components ?? []).filter((c: any) => c.status === "active")) {
            await fetch(`/api/components/${comp.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ installDate }),
            });
          }
        }
      }

      // If the linked bike changed, run sync → recalculate in the background
      // (same pattern as the add dialog). Close immediately and navigate to
      // the dashboard with a syncing spinner.
      if (newLinkedBikeId !== oldLinkedBikeId) {
        const syncKey = `trainer_syncing_${trainer.id}`;
        localStorage.setItem(syncKey, "pending");

        onOpenChange(false);
        onSyncing(trainer.id);

        // Fire-and-forget: sync re-attributes indoor rides, then recalculate
        // rebuilds component kms on the affected outdoor bikes.
        fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ after: 0 }),
        }).then(() => {
          const recalcPromises: Promise<unknown>[] = [];
          if (newLinkedBikeId) {
            recalcPromises.push(
              fetch(`/api/bikes/${newLinkedBikeId}/recalculate`, { method: "POST" })
            );
          }
          if (oldLinkedBikeId) {
            recalcPromises.push(
              fetch(`/api/bikes/${oldLinkedBikeId}/recalculate`, { method: "POST" })
            );
          }
          return Promise.all(recalcPromises);
        }).then(() => {
          localStorage.setItem(syncKey, "done");
        }).catch(() => {
          localStorage.setItem(syncKey, "done");
        });
      } else {
        // No linked bike change — just a name/type edit, close immediately
        onOpenChange(false);
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("trainer.editTitle")}</DialogTitle>
          <DialogDescription>
            {t("trainer.editDialogDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name + Install date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-trainer-name">{t("common.name")}</Label>
              <Input
                id="edit-trainer-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Home trainer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-trainer-date">
                {t("components.installDate")}
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">{t("trainer.installDateHint")}</span>
              </Label>
              <DatePicker
                id="edit-trainer-date"
                value={installDate}
                onChange={setInstallDate}
              />
              <p className="text-[10px] text-muted-foreground">
                {t("trainer.editInstallDateHint")}
              </p>
            </div>
          </div>

          {/* Purchase price */}
          <div className="space-y-2">
            <Label htmlFor="edit-trainer-price">{t("bikes.purchasePrice")} ({cs})</Label>
            <Input
              id="edit-trainer-price"
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
                    <span>
                      {linkedBikeId === "none"
                        ? t("common.none")
                        : outdoorBikes.find((b) => b.id === linkedBikeId)?.name ?? t("trainer.unknownBike")}
                    </span>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("common.saving")}
              </>
            ) : (
              t("common.saveChanges")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
