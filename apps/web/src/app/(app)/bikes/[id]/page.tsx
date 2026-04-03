"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/hooks/use-translation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ArrowLeft, Bike, ChevronDown, ClipboardCheck, Loader2, Pencil, Search, Trash2, Wrench, Dumbbell } from "lucide-react";
import { ComponentCard, type DashboardComponent } from "@/components/component-card";
import { AddComponentDialog } from "@/components/add-component-dialog";
import { AddMaintenanceDialog } from "@/components/add-maintenance-dialog";
import { EditHomeTrainerDialog } from "@/components/edit-home-trainer-dialog";
import { getComponentStatus } from "@bike-check/core";
import { useCurrency } from "@/lib/use-currency";
import { currencySymbol } from "@/lib/currency";

const EVENT_BADGE_STYLES: Record<string, string> = {
  replaced: "bg-primary/10 text-primary",
  serviced: "bg-blue-500/10 text-blue-600",
  inspected: "bg-emerald-500/10 text-emerald-600",
  adjusted: "bg-yellow-500/10 text-yellow-600",
  general: "bg-violet-500/10 text-violet-600",
  charged: "bg-emerald-500/10 text-emerald-600",
  cared: "bg-blue-500/10 text-blue-600",
};

interface BikeDetail {
  id: string;
  name: string;
  type: string;
  isTrainer: boolean;
  linkedBikeId?: string | null;
  groupsetBrand?: string;
  groupsetSpeed?: number;
  brakeType?: string;
  shiftingType?: string;
  components: any[];
}

interface MaintenanceEvent {
  id: string;
  eventType: string;
  title?: string;
  date: string;
  componentName: string;
  componentType: string;
  distanceAtEvent?: string;
  costCents?: number;
  notes?: string;
  relatedComponentIds?: string | null;
}

export default function BikeDetailPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const bikeId = params.id as string;

  const [bike, setBike] = useState<BikeDetail | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceEvent[]>([]);
  const [linkedBikeName, setLinkedBikeName] = useState<string | null>(null);
  const [outdoorBikes, setOutdoorBikes] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [replacing, setReplacing] = useState<string | null>(null);
  const currency = useCurrency();
  const cs = currencySymbol(currency);

  // Edit bike dialog state
  const [editBikeOpen, setEditBikeOpen] = useState(false);
  const [editBikeName, setEditBikeName] = useState("");
  const [editBikeType, setEditBikeType] = useState("");
  const [editBikeDate, setEditBikeDate] = useState("");
  const [editBikeKm, setEditBikeKm] = useState("");
  const [editBikePrice, setEditBikePrice] = useState("");
  const [editBikeSaving, setEditBikeSaving] = useState(false);

  // Delete bike dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Search & filter
  const [search, setSearch] = useState("");
  const [expandedMaint, setExpandedMaint] = useState<Set<string>>(new Set());
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>("status");

  // Maintenance edit/delete
  const [editMaint, setEditMaint] = useState<MaintenanceEvent | null>(null);
  const [editMaintTitle, setEditMaintTitle] = useState("");
  const [editMaintDate, setEditMaintDate] = useState("");
  const [editMaintCost, setEditMaintCost] = useState("");
  const [editMaintNotes, setEditMaintNotes] = useState("");
  const [editMaintSaving, setEditMaintSaving] = useState(false);
  const [deleteMaint, setDeleteMaint] = useState<MaintenanceEvent | null>(null);
  const [deletingMaint, setDeletingMaint] = useState(false);


  useEffect(() => {
    fetchAll();
  }, [bikeId]);

  async function fetchAll() {
    const [bikeRes, maintRes, allBikesRes] = await Promise.all([
      fetch(`/api/bikes/${bikeId}`),
      fetch(`/api/maintenance?bikeId=${bikeId}`),
      fetch("/api/bikes"),
    ]);
    if (bikeRes.status === 401) { router.push("/"); return; }
    if (bikeRes.status === 404) { router.push("/bikes"); return; }
    const bikeData = await bikeRes.json();
    setBike(bikeData);
    setEditBikeName(bikeData.name);
    setEditBikeType(bikeData.type);
    // Resolve linked bike name and outdoor bikes for edit dialog
    if (allBikesRes.ok) {
      const allBikes = await allBikesRes.json();
      setOutdoorBikes(
        allBikes
          .filter((b: any) => b.isActive && !b.isTrainer)
          .map((b: any) => ({ id: b.id, name: b.name }))
      );
      if (bikeData.linkedBikeId) {
        const linked = allBikes.find((b: any) => b.id === bikeData.linkedBikeId);
        setLinkedBikeName(linked?.name ?? null);
      } else {
        setLinkedBikeName(null);
      }
    } else {
      setLinkedBikeName(null);
    }
    // Use the earliest component install date, or the bike's createdAt
    const activeComps = (bikeData.components ?? []).filter((c: any) => c.status === "active");
    const earliestDate = activeComps.length > 0
      ? activeComps.reduce((min: string, c: any) => (c.installDate < min ? c.installDate : min), activeComps[0].installDate)
      : bikeData.createdAt?.split("T")[0] ?? new Date().toISOString().split("T")[0];
    setEditBikeDate(earliestDate);
    setEditBikePrice(bikeData.purchasePriceCents ? (bikeData.purchasePriceCents / 100).toString() : "");
    setMaintenance(await maintRes.json());
    setLoading(false);
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
        body: JSON.stringify({ eventType: "replaced", ...opts }),
      });
      await fetchAll();
    } finally {
      setReplacing(null);
    }
  }

  async function handleEditComponent(componentId: string, updates: Record<string, unknown>) {
    await fetch(`/api/components/${componentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    await fetchAll();
  }

  async function handleSaveBike() {
    setEditBikeSaving(true);
    try {
      await fetch(`/api/bikes/${bikeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editBikeName,
          type: editBikeType,
          purchasePriceCents: editBikePrice ? Math.round(parseFloat(editBikePrice) * 100) : null,
        }),
      });

      // Update install date and/or km on all active components if changed
      if (bike) {
        const activeComps = (bike.components ?? []).filter((c: any) => c.status === "active");
        const newKm = editBikeKm ? parseFloat(editBikeKm) : null;
        for (const comp of activeComps) {
          const updates: Record<string, unknown> = {};
          if (editBikeDate && comp.installDate !== editBikeDate) {
            updates.installDate = editBikeDate;
          }
          if (newKm !== null) {
            updates.currentDistanceKm = newKm;
          }
          if (Object.keys(updates).length > 0) {
            await fetch(`/api/components/${comp.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updates),
            });
          }
        }
      }

      setEditBikeOpen(false);
      setEditBikeKm("");
      await fetchAll();
    } finally {
      setEditBikeSaving(false);
    }
  }

  async function handleRemoveComponent(componentId: string) {
    await fetch(`/api/components/${componentId}`, { method: "DELETE" });
    await fetchAll();
  }

  async function handleDeleteBike() {
    setDeleting(true);
    try {
      await fetch(`/api/bikes/${bikeId}`, { method: "DELETE" });
      router.push("/bikes");
    } finally {
      setDeleting(false);
    }
  }

  function openEditMaint(event: MaintenanceEvent) {
    setEditMaint(event);
    setEditMaintTitle(event.title ?? "");
    setEditMaintDate(event.date);
    setEditMaintCost(event.costCents ? (event.costCents / 100).toFixed(2) : "");
    setEditMaintNotes(event.notes ?? "");
  }

  async function handleEditMaintSave() {
    if (!editMaint) return;
    setEditMaintSaving(true);
    const costCents = editMaintCost ? Math.round(parseFloat(editMaintCost) * 100) : null;
    await fetch(`/api/maintenance/${editMaint.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editMaintTitle.trim() || null,
        date: editMaintDate,
        costCents,
        notes: editMaintNotes.trim() || null,
      }),
    });
    setEditMaintSaving(false);
    setEditMaint(null);
    fetchAll();
  }

  async function handleDeleteMaint() {
    if (!deleteMaint) return;
    setDeletingMaint(true);
    await fetch(`/api/maintenance/${deleteMaint.id}`, { method: "DELETE" });
    setDeletingMaint(false);
    setDeleteMaint(null);
    fetchAll();
  }

  if (loading || !bike) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      </div>
    );
  }

  // Build component statuses for the cards
  const componentsWithStatus: DashboardComponent[] = bike.components
    .filter((c: any) => c.status === "active")
    .map((c: any) => {
      const status = getComponentStatus({
        currentDistanceKm: parseFloat(c.currentDistanceKm),
        currentHours: parseFloat(c.currentHours),
        installDate: c.installDate,
        thresholdDistanceKm: c.thresholdDistanceKm ? parseFloat(c.thresholdDistanceKm) : null,
        thresholdHours: c.thresholdHours ? parseFloat(c.thresholdHours) : null,
        thresholdDays: c.thresholdDays,
      });
      return { ...c, status };
    });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/bikes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("bikes.title")}
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bike.isTrainer ? "bg-violet-500/10" : "bg-primary/10"}`}>
              {bike.isTrainer
                ? <Dumbbell className="h-5 w-5 text-violet-600" />
                : <Bike className="h-5 w-5 text-primary" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{bike.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                {bike.isTrainer ? (
                  <Badge variant="secondary" className="text-[10px] bg-violet-500/10 text-violet-600 border-violet-500/20">
                    {t("rides.indoor")}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="capitalize text-[10px]">{t("bikes.bikeTypes." + bike.type)}</Badge>
                )}
                {linkedBikeName && (
                  <span className="text-xs text-muted-foreground">· {linkedBikeName}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <AddComponentDialog bikeId={bikeId} bikeType={bike.type} onAdded={fetchAll} />
            {bike.isTrainer ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditBikeOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  {t("trainer.editTitle")}
                </Button>
                <EditHomeTrainerDialog
                  open={editBikeOpen}
                  onOpenChange={setEditBikeOpen}
                  outdoorBikes={outdoorBikes}
                  trainer={{
                    id: bike.id,
                    name: bike.name,
                    linkedBikeId: bike.linkedBikeId ?? null,
                    installDate: editBikeDate,
                  }}
                  onSaved={fetchAll}
                  onSyncing={(id) => router.push(`/dashboard?syncing=${id}`)}
                />
              </>
            ) : (
              <Dialog open={editBikeOpen} onOpenChange={setEditBikeOpen}>
                <DialogTrigger render={<Button variant="outline" size="sm" />}>
                  <Pencil className="h-4 w-4" />
                  {t("bikes.editBike")}
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t("bikes.editBike")}</DialogTitle>
                    <DialogDescription>{t("bikes.editBike")}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="bike-name">{t("common.name")}</Label>
                      <Input id="bike-name" value={editBikeName} onChange={(e) => setEditBikeName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("onboarding.bikeType")}</Label>
                      <Select value={editBikeType} onValueChange={(v) => v && setEditBikeType(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(["road", "gravel", "mountain", "commuter", "other"] as const)
                            .map((key) => ({ key, label: t("bikes.bikeTypes." + key) }))
                            .sort((a, b) => a.label.localeCompare(b.label))
                            .map(({ key, label }) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="bike-date">{t("components.installDate")}</Label>
                        <DatePicker
                          id="bike-date"
                          value={editBikeDate}
                          onChange={setEditBikeDate}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bike-km">{t("components.thresholdKm")}</Label>
                        <Input
                          id="bike-km"
                          type="number"
                          step="1"
                          placeholder=""
                          value={editBikeKm}
                          onChange={(e) => setEditBikeKm(e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Updates all active components on this bike.</p>
                    <div className="space-y-2">
                      <Label htmlFor="bike-price">{t("bikes.purchasePrice")} ({cs})</Label>
                      <Input
                        id="bike-price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={editBikePrice}
                        onChange={(e) => setEditBikePrice(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditBikeOpen(false)}>{t("common.cancel")}</Button>
                    <Button onClick={handleSaveBike} disabled={editBikeSaving}>
                      {editBikeSaving ? t("common.saving") : t("common.save")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" />}>
                <Trash2 className="h-4 w-4" />
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>{t("bikes.removeBike")}</DialogTitle>
                  <DialogDescription>
                    {bike.isTrainer
                      ? t("bikes.removeTrainerConfirm")
                      : t("bikes.removeBikeConfirm")}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteOpen(false)}>{t("common.cancel")}</Button>
                  <Button variant="destructive" onClick={handleDeleteBike} disabled={deleting}>
                    {deleting ? t("common.loading") : t("bikes.removeBike")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Components */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("bikes.components")}</h2>

        {componentsWithStatus.length > 0 && (
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("common.search") + "..."}
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
        )}

        {(() => {
          const q = search.trim().toLowerCase();
          const STATUS_ORDER: Record<string, number> = { overdue: 0, critical: 1, warning: 2, approaching: 3, good: 4 };
          const filtered = componentsWithStatus.filter((comp) => {
            if (q) {
              const label = t("components.labels." + comp.type).toLowerCase();
              const matches =
                label.includes(q) ||
                comp.name.toLowerCase().includes(q) ||
                comp.type.toLowerCase().includes(q) ||
                (comp.brand?.toLowerCase().includes(q) ?? false) ||
                (comp.model?.toLowerCase().includes(q) ?? false);
              if (!matches) return false;
            }
            if (statusFilters.size === 0) return true;
            return statusFilters.has(comp.status.level);
          }).sort((a, b) => {
            switch (sortBy) {
              case "name": return t("components.labels." + a.type).localeCompare(t("components.labels." + b.type));
              case "km": return Number(b.currentDistanceKm) - Number(a.currentDistanceKm);
              case "installDate": return (a.installDate ?? "").localeCompare(b.installDate ?? "");
              default: return (STATUS_ORDER[a.status.level] ?? 5) - (STATUS_ORDER[b.status.level] ?? 5);
            }
          });

          if (componentsWithStatus.length === 0) {
            return (
              <Card size="sm">
                <CardContent className="text-sm text-muted-foreground text-center py-8">
                  {t("bikes.noComponents")}
                </CardContent>
              </Card>
            );
          }

          if (filtered.length === 0) {
            return (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("common.noResults")}
              </p>
            );
          }

          return (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((comp) => (
                <ComponentCard
                  key={comp.id}
                  component={comp}
                  onReplace={handleReplace}
                  onEdit={handleEditComponent}
                  onRemove={handleRemoveComponent}
                  isReplacing={replacing === comp.id}
                  linkToDetail
                  currency={currency}
                />
              ))}
            </div>
          );
        })()}
      </div>


      {/* Maintenance History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{t("bikes.maintenanceHistory")}</h2>
          <AddMaintenanceDialog bikeId={bikeId} onAdded={fetchAll} />
        </div>
        {maintenance.length === 0 ? (
          <Card size="sm">
            <CardContent className="text-sm text-muted-foreground text-center py-8">
              {t("bikes.noMaintenance")}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {maintenance.map((event) => {
              const isGeneral = event.eventType === "general";
              const ebStyle = EVENT_BADGE_STYLES[event.eventType] ?? EVENT_BADGE_STYLES.replaced;
              const Icon = isGeneral ? ClipboardCheck : Wrench;
              return (
                <Card key={event.id} size="sm">
                  <CardContent className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium truncate">
                            {isGeneral
                              ? (event.title ?? t("maintenance.eventTypes.general"))
                              : t("components.labels." + event.componentType)}
                          </span>
                          <Badge className={`text-[10px] ${ebStyle}`}>{t("maintenance.eventTypes." + event.eventType)}</Badge>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => openEditMaint(event)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title={t("common.edit")}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setDeleteMaint(event)}
                            className="text-muted-foreground hover:text-red-600 transition-colors"
                            title={t("common.remove")}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {event.date}
                        {event.distanceAtEvent && ` \u00b7 ${Number(event.distanceAtEvent).toLocaleString()} km`}
                        {event.costCents && ` \u00b7 ${cs}${(event.costCents / 100).toFixed(2)}`}
                      </p>
                      {isGeneral && event.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {event.notes}
                        </p>
                      )}
                      {(() => {
                        if (!event.relatedComponentIds) return null;
                        let ids: string[];
                        try { ids = JSON.parse(event.relatedComponentIds); } catch { return null; }
                        if (!ids.length) return null;
                        const expanded = expandedMaint.has(event.id);
                        return (
                          <div className="mt-1">
                            <button
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => {
                                const next = new Set(expandedMaint);
                                if (expanded) next.delete(event.id); else next.add(event.id);
                                setExpandedMaint(next);
                              }}
                            >
                              <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
                              {ids.length} {t("dashboard.components").toLowerCase()}
                            </button>
                            {expanded && (
                              <div className="mt-1 ml-4 space-y-0.5">
                                {ids.map((compId) => {
                                  const comp = bike?.components?.find((c: any) => c.id === compId);
                                  return (
                                    <div key={compId} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                                      {comp ? t("components.labels." + comp.type) : compId}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Maintenance edit dialog */}
      <Dialog open={!!editMaint} onOpenChange={(v: boolean) => { if (!v) setEditMaint(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("common.edit")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editMaint?.eventType === "general" && (
              <div>
                <Label>{t("maintenance.titleField")}</Label>
                <Input
                  value={editMaintTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditMaintTitle(e.target.value)}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("maintenance.date")}</Label>
                <DatePicker value={editMaintDate} onChange={setEditMaintDate} />
              </div>
              <div>
                <Label>{t("maintenance.cost")} ({cs})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editMaintCost}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditMaintCost(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>{t("maintenance.notesField")}</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={editMaintNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditMaintNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditMaint(null)}>{t("common.cancel")}</Button>
            <Button onClick={handleEditMaintSave} disabled={editMaintSaving}>
              {editMaintSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maintenance delete dialog */}
      <Dialog open={!!deleteMaint} onOpenChange={(v: boolean) => { if (!v) setDeleteMaint(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("common.remove")}</DialogTitle>
            <DialogDescription>
              {deleteMaint?.title ?? deleteMaint?.componentName ?? ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteMaint(null)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={handleDeleteMaint} disabled={deletingMaint}>
              {deletingMaint && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t("common.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
