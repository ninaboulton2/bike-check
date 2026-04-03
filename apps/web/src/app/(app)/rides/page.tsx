"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-picker";
import { Route, Home, Plus, Loader2, Trash2 } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

interface Ride {
  id: string;
  date: string;
  distanceKm: string;
  movingTimeSeconds: number;
  isIndoor: boolean;
  conditions: string;
  source: string;
  bikeId: string | null;
}

interface Bike {
  id: string;
  name: string;
  isTrainer: boolean;
  type: string;
}

const CONDITION_OPTIONS = ["dry", "wet", "muddy", "dusty", "winter"];

export default function RidesPage() {
  const { t } = useTranslation();
  const [rides, setRides] = useState<Ride[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loading, setLoading] = useState(true);

  // Add ride dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [addBikeId, setAddBikeId] = useState("");
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10));
  const [addDistance, setAddDistance] = useState("");
  const [addHours, setAddHours] = useState("");
  const [addMinutes, setAddMinutes] = useState("");
  const [addConditions, setAddConditions] = useState("dry");
  const [addIndoor, setAddIndoor] = useState(false);
  const [addSaving, setAddSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function resetAddForm() {
    setAddBikeId("");
    setAddDate(new Date().toISOString().slice(0, 10));
    setAddDistance("");
    setAddHours("");
    setAddMinutes("");
    setAddConditions("dry");
    setAddIndoor(false);
  }

  // Non-trainer bikes for the add ride selector
  const outdoorBikes = bikes.filter((b) => !b.isTrainer);

  async function handleAddRide() {
    const dist = parseFloat(addDistance);
    if (!addBikeId || !addDate || isNaN(dist) || dist <= 0) return;
    setAddSaving(true);

    const h = parseInt(addHours) || 0;
    const m = parseInt(addMinutes) || 0;
    const movingTimeSeconds = h > 0 || m > 0 ? h * 3600 + m * 60 : undefined;

    const res = await fetch("/api/rides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bikeId: addBikeId,
        date: addDate,
        distanceKm: dist,
        conditions: addConditions,
        movingTimeSeconds,
        isIndoor: addIndoor,
      }),
    });

    if (res.ok) {
      const newRide = await res.json();
      setRides((prev) => [newRide, ...prev]);
      setAddOpen(false);
      resetAddForm();
    }
    setAddSaving(false);
  }

  function fetchRides() {
    Promise.all([
      fetch("/api/rides?limit=10").then((r) => r.json()),
      fetch("/api/bikes").then((r) => r.json()),
    ]).then(([ridesData, bikesData]) => {
      setRides(ridesData);
      setBikes(bikesData);
      setLoading(false);
    });
  }

  useEffect(() => {
    fetchRides();
  }, []);

  async function updateConditions(rideId: string, conditions: string) {
    await fetch(`/api/rides/${rideId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conditions }),
    });
    setRides((prev) =>
      prev.map((r) => (r.id === rideId ? { ...r, conditions } : r))
    );
  }

  async function updateBike(rideId: string, bikeId: string | null) {
    await fetch(`/api/rides/${rideId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bikeId }),
    });
    setRides((prev) =>
      prev.map((r) => (r.id === rideId ? { ...r, bikeId } : r))
    );
  }

  async function handleDeleteRide(rideId: string) {
    setDeletingId(rideId);
    const res = await fetch(`/api/rides/${rideId}`, { method: "DELETE" });
    if (res.ok) {
      setRides((prev) => prev.filter((r) => r.id !== rideId));
    }
    setDeletingId(null);
  }

  function getBikeName(bikeId: string | null): string | null {
    if (!bikeId) return null;
    return bikes.find((b) => b.id === bikeId)?.name ?? null;
  }

  function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("rides.title")}</h1>
          <p className="text-sm text-muted-foreground">
            Tag ride conditions to improve wear accuracy. Rain and mud accelerate
            component wear. For indoor rides, assign which bike was on the trainer.
          </p>
        </div>

        <Dialog open={addOpen} onOpenChange={(v: boolean) => { setAddOpen(v); if (!v) resetAddForm(); }}>
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            <Plus className="h-4 w-4 mr-1" />
            {t("rides.addRide")}
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("rides.addRide")}</DialogTitle>
              <DialogDescription>{t("rides.addRideDescription")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Bike selector (no trainers) */}
              <div>
                <Label>{t("rides.bike")}</Label>
                <Select value={addBikeId} onValueChange={(v) => setAddBikeId(v ?? "")}>
                  <SelectTrigger className="mt-1">
                    <span className="truncate">
                      {outdoorBikes.find((b) => b.id === addBikeId)?.name ?? t("rides.bike")}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {outdoorBikes.sort((a, b) => a.name.localeCompare(b.name)).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Indoor/Outdoor toggle */}
              <div className="flex items-center gap-3">
                <Label>{t("rides.indoor")}/{t("rides.outdoor")}</Label>
                <div className="flex gap-1.5">
                  <Badge
                    variant={!addIndoor ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => setAddIndoor(false)}
                  >
                    {t("rides.outdoor")}
                  </Badge>
                  <Badge
                    variant={addIndoor ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => setAddIndoor(true)}
                  >
                    {t("rides.indoor")}
                  </Badge>
                </div>
              </div>

              {/* Date picker */}
              <div>
                <Label>{t("rides.date")}</Label>
                <DatePicker value={addDate} onChange={setAddDate} className="mt-1 w-full" />
              </div>

              {/* Distance */}
              <div>
                <Label htmlFor="add-distance">{t("rides.distance")} (km)</Label>
                <Input
                  id="add-distance"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={addDistance}
                  onChange={(e) => setAddDistance(e.target.value)}
                  className="mt-1"
                  placeholder="0.0"
                />
              </div>

              {/* Duration (optional) */}
              <div>
                <Label>{t("rides.duration")}</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={addHours}
                    onChange={(e) => setAddHours(e.target.value)}
                    placeholder="0h"
                    className="w-20"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    step="1"
                    value={addMinutes}
                    onChange={(e) => setAddMinutes(e.target.value)}
                    placeholder="0m"
                    className="w-20"
                  />
                </div>
              </div>

              {/* Conditions */}
              <div>
                <Label>{t("rides.condition")}</Label>
                <Select value={addConditions} onValueChange={(v) => setAddConditions(v ?? "dry")}>
                  <SelectTrigger className="mt-1">
                    <span>{t("rides.conditions." + addConditions)}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {t("rides.conditions." + c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleAddRide}
                disabled={addSaving || !addBikeId || !addDistance}
              >
                {addSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {t("rides.addRide")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("rides.date")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("rides.indoor")}/{t("rides.outdoor")}</TableHead>
                <TableHead>{t("rides.bike")}</TableHead>
                <TableHead className="text-right">{t("rides.distance")}</TableHead>
                <TableHead className="text-right hidden sm:table-cell">
                  {t("rides.duration")}
                </TableHead>
                <TableHead>{t("rides.condition")}</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rides.map((ride) => {
                const bikeName = getBikeName(ride.bikeId);
                return (
                  <TableRow key={ride.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(ride.date).toLocaleDateString()}
                    </TableCell>

                    <TableCell className="hidden sm:table-cell">
                      {ride.isIndoor ? (
                        <Badge
                          variant="outline"
                          className="bg-violet-500/10 text-violet-600 border-violet-500/20 text-[10px] gap-1"
                        >
                          <Home className="h-3 w-3" />
                          {t("rides.indoor")}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] gap-1"
                        >
                          <Route className="h-3 w-3" />
                          {t("rides.outdoor")}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Bike column: selector for indoor rides, plain name for outdoor */}
                    <TableCell>
                      {ride.isIndoor ? (
                        <Select
                          value={ride.bikeId ?? ""}
                          onValueChange={(value) =>
                            updateBike(ride.id, value || null)
                          }
                        >
                          <SelectTrigger className="h-7 w-36 text-xs">
                            <span className="truncate">
                              {bikeName ?? (
                                <span className="text-muted-foreground italic">
                                  {t("rides.bike")}…
                                </span>
                              )}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {outdoorBikes.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm font-medium">
                          {bikeName ?? "—"}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-right font-medium tabular-nums">
                      {Number(ride.distanceKm).toFixed(1)} km
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground hidden sm:table-cell tabular-nums">
                      {ride.movingTimeSeconds
                        ? formatDuration(ride.movingTimeSeconds)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={ride.conditions}
                        onValueChange={(value) => {
                          if (value) updateConditions(ride.id, value);
                        }}
                      >
                        <SelectTrigger className="h-7 w-auto min-w-[6rem] text-xs">
                          <span>{t("rides.conditions." + ride.conditions)}</span>
                        </SelectTrigger>
                        <SelectContent>
                          {[...CONDITION_OPTIONS].sort().map((c) => (
                            <SelectItem key={c} value={c}>
                              <span className="flex items-center justify-between gap-3 w-full">
                                <span>{t("rides.conditions." + c)}</span>
                                <span className="text-[10px] text-muted-foreground font-medium tabular-nums">
                                  {c === "dry" ? "x1" : t("rides.conditionWear." + c)}
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {ride.source === "manual" && (
                        <button
                          onClick={() => handleDeleteRide(ride.id)}
                          disabled={deletingId === ride.id}
                          className="text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
                          title={t("common.remove")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {rides.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Route className="h-8 w-8 text-muted-foreground/40" />
                      <p>{t("rides.noRides")}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
