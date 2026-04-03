"use client";

import { useEffect, useState } from "react";
import { useCurrency } from "@/lib/use-currency";
import { currencySymbol } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
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
import {
  Wrench,
  RefreshCw,
  Eye,
  Settings2,
  BatteryCharging,
  ClipboardCheck,
  DollarSign,
  Pencil,
  Trash2,
  Loader2,
  Plus,
  Search,
  ChevronDown,
} from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

interface MaintenanceEvent {
  id: string;
  componentId: string | null;
  title: string | null;
  componentType: string | null;
  eventType: string;
  date: string;
  distanceAtEvent: string;
  hoursAtEvent: string;
  costCents: number | null;
  notes: string | null;
  newBrand: string | null;
  newModel: string | null;
  componentName?: string;
  bikeName?: string;
  bikeId?: string;
  relatedComponentIds?: string | null;
}

interface BikeOption {
  id: string;
  name: string;
  type: string;
  purchasePriceCents?: number | null;
  components: { id: string; type: string; name: string }[];
}

const QUICK_TITLE_KEYS = [
  "annualService",
  "bikeRevision",
  "brakeAdjustment",
  "gearTuning",
  "generalCheck",
  "wheelTruing",
] as const;

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  replaced: RefreshCw,
  serviced: Wrench,
  inspected: Eye,
  adjusted: Settings2,
  general: ClipboardCheck,
  charged: BatteryCharging,
  cared: Wrench,
};

const EVENT_BADGE_STYLES: Record<string, string> = {
  replaced: "bg-primary/10 text-primary border-primary/20",
  serviced: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  inspected: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  adjusted: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  general: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  charged: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  cared: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

export default function MaintenancePage() {
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const currency = useCurrency();
  const cs = currencySymbol(currency);

  // Search & filter
  const [search, setSearch] = useState("");
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>("date");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [bikeFilter, setBikeFilter] = useState<string>("all");

  // Add dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [bikes, setBikes] = useState<BikeOption[]>([]);
  const [addBikeId, setAddBikeId] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10));
  const [addCost, setAddCost] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addReplacedComponents, setAddReplacedComponents] = useState<Set<string>>(new Set());
  const [addSaving, setAddSaving] = useState(false);

  // Edit state
  const [editEvent, setEditEvent] = useState<MaintenanceEvent | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCost, setEditCost] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Delete state
  const [deleteEvent, setDeleteEvent] = useState<MaintenanceEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchEvents() {
    const res = await fetch("/api/maintenance");
    const data = await res.json();
    setEvents(data);
    setLoading(false);
  }

  async function fetchBikes() {
    const res = await fetch("/api/bikes?withComponents=true");
    const data = await res.json();
    setBikes(
      data.map((b: any) => ({
        id: b.id,
        name: b.name,
        type: b.type,
        purchasePriceCents: b.purchasePriceCents ?? null,
        components: (b.components ?? [])
          .filter((c: any) => c.status === "active")
          .map((c: any) => ({ id: c.id, type: c.type, name: c.name })),
      }))
    );
  }

  useEffect(() => {
    fetchEvents();
    fetchBikes();
  }, []);

  function openAdd() {
    fetchBikes();
    setAddBikeId("");
    setAddTitle("");
    setAddDate(new Date().toISOString().slice(0, 10));
    setAddCost("");
    setAddNotes("");
    setAddReplacedComponents(new Set());
    setAddOpen(true);
  }

  const selectedBike = bikes.find((b) => b.id === addBikeId);

  function toggleReplacedComponent(compId: string) {
    setAddReplacedComponents((prev) => {
      const next = new Set(prev);
      if (next.has(compId)) next.delete(compId);
      else next.add(compId);
      return next;
    });
  }

  async function handleAddSubmit() {
    if (!addBikeId || !addTitle.trim()) return;
    setAddSaving(true);
    const costCents = addCost ? Math.round(parseFloat(addCost) * 100) : undefined;

    // Create general maintenance event with related components
    await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bikeId: addBikeId,
        title: addTitle.trim(),
        date: addDate,
        costCents: costCents && costCents > 0 ? costCents : undefined,
        notes: addNotes.trim() || undefined,
        componentIds: [...addReplacedComponents],
      }),
    });

    setAddSaving(false);
    setAddOpen(false);
    fetchEvents();
  }

  function openEdit(event: MaintenanceEvent) {
    setEditEvent(event);
    setEditTitle(event.title ?? "");
    setEditDate(event.date);
    setEditCost(event.costCents ? (event.costCents / 100).toFixed(2) : "");
    setEditNotes(event.notes ?? "");
  }

  async function handleEditSave() {
    if (!editEvent) return;
    setEditSaving(true);
    const costCents = editCost ? Math.round(parseFloat(editCost) * 100) : null;
    await fetch(`/api/maintenance/${editEvent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle.trim() || null,
        date: editDate,
        costCents,
        notes: editNotes.trim() || null,
      }),
    });
    setEditSaving(false);
    setEditEvent(null);
    fetchEvents();
  }

  async function handleDelete() {
    if (!deleteEvent) return;
    setDeleting(true);
    await fetch(`/api/maintenance/${deleteEvent.id}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteEvent(null);
    fetchEvents();
  }

  function getDisplayName(event: MaintenanceEvent) {
    const isGeneral = event.eventType === "general";
    return isGeneral
      ? (event.title ?? t("maintenance.eventTypes.general"))
      : (event.componentType
          ? t("components.labels." + event.componentType)
          : (event.componentName ?? t("maintenance.eventTypes." + event.eventType)));
  }

  // Extract unique bikes from events
  const bikeTabs = (() => {
    const map = new Map<string, string>();
    for (const e of events) {
      if (e.bikeId && e.bikeName) map.set(e.bikeId, e.bikeName);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  })();

  // Filter events
  const q = search.trim().toLowerCase();
  const filteredEvents = events.filter((event) => {
    if (bikeFilter !== "all" && event.bikeId !== bikeFilter) return false;
    if (q) {
      const name = getDisplayName(event).toLowerCase();
      const bike = (event.bikeName ?? "").toLowerCase();
      if (!name.includes(q) && !bike.includes(q) && !event.eventType.includes(q)) return false;
    }
    if (typeFilters.size > 0 && !typeFilters.has(event.eventType)) return false;
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case "type": return a.eventType.localeCompare(b.eventType);
      case "cost": return (b.costCents ?? 0) - (a.costCents ?? 0);
      default: return b.date.localeCompare(a.date); // date desc
    }
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Scope stats to the selected bike tab
  const scopedEvents = bikeFilter === "all" ? events : events.filter((e) => e.bikeId === bikeFilter);
  const scopedBikes = bikeFilter === "all" ? bikes : bikes.filter((b) => b.id === bikeFilter);
  const totalEvents = scopedEvents.length;
  const totalMaintenanceCost = scopedEvents.reduce((sum, e) => sum + (e.costCents ?? 0), 0);
  const totalBikePurchase = scopedBikes.reduce((sum, b) => sum + (b.purchasePriceCents ?? 0), 0);
  const totalBikeCost = totalBikePurchase + totalMaintenanceCost;
  const currentYear = new Date().getFullYear();
  const thisYearCost = scopedEvents
    .filter((e) => new Date(e.date).getFullYear() === currentYear)
    .reduce((sum, e) => sum + (e.costCents ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("maintenance.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("maintenance.subtitle")}
          </p>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          {t("maintenance.logMaintenance")}
        </Button>
      </div>

      {/* Summary stats */}
      {totalEvents > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card size="sm">
            <CardContent className="flex items-center gap-3 pt-1">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Wrench className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{totalEvents}</p>
                <p className="text-xs text-muted-foreground">{t("maintenance.events")}</p>
              </div>
            </CardContent>
          </Card>
          {totalBikeCost > 0 && (
            <Card size="sm">
              <CardContent className="flex items-center gap-3 pt-1">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <DollarSign className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{cs}{(totalBikeCost / 100).toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">{t("maintenance.totalBikeCost")}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {totalMaintenanceCost > 0 && (
            <Card size="sm">
              <CardContent className="flex items-center gap-3 pt-1">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{cs}{(totalMaintenanceCost / 100).toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">{t("maintenance.totalSpent")}</p>
                </div>
              </CardContent>
            </Card>
          )}
          <Card size="sm">
            <CardContent className="flex items-center gap-3 pt-1">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                <DollarSign className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{cs}{(thisYearCost / 100).toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">{t("maintenance.thisYear")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bike tabs */}
      {bikeTabs.length >= 1 && (
        <Tabs value={bikeFilter} onValueChange={setBikeFilter}>
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              {t("dashboard.filterAll")}
              <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">
                {events.length}
              </Badge>
            </TabsTrigger>
            {bikeTabs.map((bike) => {
              const count = events.filter((e) => e.bikeId === bike.id).length;
              return (
                <TabsTrigger key={bike.id} value={bike.id} className="gap-2">
                  {bike.name}
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">
                    {count}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      )}

      {/* Search & filter */}
      {totalEvents > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
            {([
              { value: "replaced", label: t("maintenance.eventTypes.replaced"), className: "bg-primary/10 text-primary" },
              { value: "serviced", label: t("maintenance.eventTypes.serviced"), className: "bg-blue-500/10 text-blue-600" },
              { value: "general", label: t("maintenance.eventTypes.general"), className: "bg-violet-500/10 text-violet-600" },
              { value: "charged", label: t("maintenance.eventTypes.charged"), className: "bg-emerald-500/10 text-emerald-600" },
              { value: "cared", label: t("maintenance.eventTypes.cared"), className: "bg-blue-500/10 text-blue-600" },
            ]).map((f) => {
              const active = typeFilters.has(f.value);
              return (
                <Badge
                  key={f.value}
                  variant={active ? "default" : "outline"}
                  className={`cursor-pointer text-xs ${active ? "" : f.className}`}
                  onClick={() => {
                    const next = new Set(typeFilters);
                    if (active) next.delete(f.value); else next.add(f.value);
                    setTypeFilters(next);
                  }}
                >
                  {f.label}
                </Badge>
              );
            })}
            {typeFilters.size > 0 && (
              <Badge variant="outline" className="cursor-pointer text-xs text-muted-foreground" onClick={() => setTypeFilters(new Set())}>
                {t("dashboard.filterAll")}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-2">{t("dashboard.sortBy")}:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs border rounded px-1.5 py-0.5 bg-background text-foreground"
            >
              <option value="date">{t("maintenance.sortDate")}</option>
              <option value="type">{t("maintenance.sortType")}</option>
              <option value="cost">{t("maintenance.sortCost")}</option>
            </select>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-3">
        {filteredEvents.map((event) => {
          const Icon = EVENT_ICONS[event.eventType] ?? Wrench;
          const badgeStyle =
            EVENT_BADGE_STYLES[event.eventType] ?? EVENT_BADGE_STYLES.replaced;
          const displayName = getDisplayName(event);

          return (
            <Card key={event.id} size="sm">
              <CardContent>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {displayName}
                        </p>
                        {event.bikeName && (
                          <p className="text-xs text-muted-foreground truncate">
                            {event.bikeName}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={`text-[10px] ${badgeStyle}`}>
                          {t("maintenance.eventTypes." + event.eventType)}
                        </Badge>
                        <time className="text-xs text-muted-foreground">
                          {new Date(event.date).toLocaleDateString()}
                        </time>
                        <button
                          onClick={() => openEdit(event)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title={t("common.edit")}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteEvent(event)}
                          className="text-muted-foreground hover:text-red-600 transition-colors"
                          title={t("common.remove")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {event.distanceAtEvent && (
                        <span className="tabular-nums">
                          {t("maintenance.atDistance", { km: Number(event.distanceAtEvent).toLocaleString() })}
                        </span>
                      )}
                      {event.costCents != null && event.costCents > 0 && (
                        <span className="font-medium text-foreground tabular-nums">
                          {cs}{(event.costCents / 100).toFixed(2)}
                        </span>
                      )}
                      {event.newBrand && (
                        <span>
                          {t("maintenance.newPart")}: {event.newBrand} {event.newModel ?? ""}
                        </span>
                      )}
                    </div>
                    {event.notes && (
                      <p className="mt-2 text-xs text-muted-foreground italic">
                        {event.notes}
                      </p>
                    )}
                    {/* Expandable related components */}
                    {(() => {
                      if (!event.relatedComponentIds) return null;
                      let ids: string[];
                      try { ids = JSON.parse(event.relatedComponentIds); } catch { return null; }
                      if (!ids.length) return null;
                      const expanded = expandedIds.has(event.id);
                      const bikeData = bikes.find((b: BikeOption) => b.id === event.bikeId);
                      return (
                        <div className="mt-2">
                          <button
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => {
                              const next = new Set(expandedIds);
                              if (expanded) next.delete(event.id); else next.add(event.id);
                              setExpandedIds(next);
                            }}
                          >
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                            {ids.length} {ids.length === 1 ? t("dashboard.components").toLowerCase().replace(/s$/, "") : t("dashboard.components").toLowerCase()}
                          </button>
                          {expanded && (
                            <div className="mt-1.5 ml-5 space-y-1">
                              {ids.map((compId) => {
                                const comp = bikeData?.components.find((c: { id: string; type: string; name: string }) => c.id === compId);
                                return (
                                  <div key={compId} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                                    {comp ? t("components.labels." + comp.type) : compId}
                                    {comp?.name && comp.name !== t("components.labels." + comp.type) && (
                                      <span className="text-muted-foreground/60">({comp.name})</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filteredEvents.length === 0 && events.length > 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("common.noResults")}
          </p>
        )}
        {events.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Wrench className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="mt-4 font-medium">{t("maintenance.noEvents")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("maintenance.noEventsDescription")}
            </p>
          </div>
        )}
      </div>

      {/* Add maintenance dialog */}
      <Dialog open={addOpen} onOpenChange={(v: boolean) => { if (!v) setAddOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("maintenance.logMaintenance")}</DialogTitle>
            <DialogDescription>{t("maintenance.logDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Bike selector */}
            <div>
              <Label>{t("rides.bike")}</Label>
              <Select value={addBikeId} onValueChange={(v) => { if (v) setAddBikeId(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder={t("rides.bike")} />
                </SelectTrigger>
                <SelectContent>
                  {[...bikes].sort((a, b) => a.name.localeCompare(b.name)).map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick-select chips */}
            {addBikeId && (
              <>
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
                          variant={addTitle === label ? "default" : "outline"}
                          className="cursor-pointer text-xs"
                          onClick={() => setAddTitle(addTitle === label ? "" : label)}
                        >
                          {label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <Label>{t("maintenance.titleField")}</Label>
                  <Input
                    value={addTitle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddTitle(e.target.value)}
                  />
                </div>

                {/* Date + Cost */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("maintenance.date")}</Label>
                    <DatePicker value={addDate} onChange={setAddDate} />
                  </div>
                  <div>
                    <Label>{t("maintenance.cost")} ({cs})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={addCost}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddCost(e.target.value)}
                    />
                  </div>
                </div>

                {/* Components to replace */}
                {selectedBike && selectedBike.components.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      {t("components.replaceTitle")}
                    </Label>
                    <div className="space-y-1.5 rounded-lg border p-3">
                      {selectedBike.components
                        .sort((a, b) => t("components.labels." + a.type).localeCompare(t("components.labels." + b.type)))
                        .map((comp) => (
                        <label key={comp.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={addReplacedComponents.has(comp.id)}
                            onCheckedChange={() => toggleReplacedComponent(comp.id)}
                          />
                          <span>{t("components.labels." + comp.type)}</span>
                          {comp.name !== t("components.labels." + comp.type) && (
                            <span className="text-xs text-muted-foreground">({comp.name})</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <Label>{t("maintenance.notesField")}</Label>
                  <textarea
                    className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={addNotes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAddNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAddSubmit} disabled={addSaving || !addBikeId || !addTitle.trim()}>
              {addSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editEvent} onOpenChange={(v: boolean) => { if (!v) setEditEvent(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("common.edit")}</DialogTitle>
            <DialogDescription>
              {editEvent ? getDisplayName(editEvent) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editEvent?.eventType === "general" && (
              <div>
                <Label>{t("maintenance.titleField")}</Label>
                <Input
                  value={editTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("maintenance.date")}</Label>
                <DatePicker value={editDate} onChange={setEditDate} />
              </div>
              <div>
                <Label>{t("maintenance.cost")} ({cs})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editCost}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditCost(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>{t("maintenance.notesField")}</Label>
              <textarea
                className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={editNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditEvent(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteEvent} onOpenChange={(v: boolean) => { if (!v) setDeleteEvent(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("common.remove")}</DialogTitle>
            <DialogDescription>
              {deleteEvent ? getDisplayName(deleteEvent) : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteEvent(null)}>
              {t("common.cancel")}
            </Button>
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
