"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AddHomeTrainerDialog } from "@/components/add-home-trainer-dialog";
import { Bike, ArrowRight, Plus, Dumbbell, RotateCcw, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

interface BikeData {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  isTrainer: boolean;
  linkedBikeId?: string | null;
  stravaGearId?: string;
}

export default function BikesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bikes, setBikes] = useState<BikeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [trainerOpen, setTrainerOpen] = useState(false);
  const [reactivating, setReactivating] = useState<string | null>(null);

  // Highlight state — set when arriving from onboarding (?highlight=trainer)
  const [highlighted, setHighlighted] = useState(false);
  const trainerBtnRef = useRef<HTMLDivElement>(null);

  async function fetchBikes() {
    const res = await fetch("/api/bikes");
    if (res.status === 401) { router.push("/"); return; }
    const data = await res.json();
    setBikes(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchBikes();
  }, []);

  // Detect highlight param and auto-open the dialog with animation
  useEffect(() => {
    if (searchParams.get("highlight") === "trainer") {
      setHighlighted(true);
      // Scroll the button into view smoothly after a short delay
      const scrollTimer = setTimeout(() => {
        trainerBtnRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
      // Remove highlight after 7 seconds
      const dimTimer = setTimeout(() => setHighlighted(false), 7000);
      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(dimTimer);
      };
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const activeBikes = bikes.filter((b) => b.isActive && !b.isTrainer);
  const trainerBikes = bikes.filter((b) => b.isActive && b.isTrainer);
  const inactiveBikes = bikes.filter((b) => !b.isActive);
  const hasAnyBike = activeBikes.length > 0 || trainerBikes.length > 0 || inactiveBikes.length > 0;

  async function handleReactivate(bikeId: string) {
    setReactivating(bikeId);
    try {
      await fetch(`/api/bikes/${bikeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      await fetchBikes();
    } finally {
      setReactivating(null);
    }
  }

  if (!hasAnyBike) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Bike className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-6 text-xl font-semibold">{t("bikes.noBikes")}</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {t("bikes.noBikesDescription")}
        </p>
        <Link href="/onboarding" className={buttonVariants({ className: "mt-6 gap-1.5" })}>
          {t("bikes.addBike")}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Shared dialog */}
      <AddHomeTrainerDialog
        open={trainerOpen}
        onOpenChange={setTrainerOpen}
        outdoorBikes={activeBikes.map((b) => ({ id: b.id, name: b.name }))}
        onCreated={(bikeId) => router.push(`/dashboard?syncing=${bikeId}`)}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("bikes.title")}</h1>
        </div>
        <div className="flex gap-2 items-center">
          {/* Add home trainer button — with optional highlight */}
          <div ref={trainerBtnRef} className="relative">
            {highlighted && (
              <>
                {/* Pulsing ring behind the button */}
                <span className="absolute inset-0 rounded-md animate-ping bg-violet-500/30 pointer-events-none" />
                {/* Callout tooltip */}
                <div className="absolute -bottom-11 left-1/2 -translate-x-1/2 whitespace-nowrap z-50">
                  <div className="relative bg-violet-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg">
                    {t("bikes.addTrainer")}
                    {/* Arrow pointing up */}
                    <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-violet-600" />
                  </div>
                </div>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setHighlighted(false);
                setTrainerOpen(true);
              }}
              className={
                highlighted
                  ? "relative border-violet-500 text-violet-700 bg-violet-50 hover:bg-violet-100 hover:border-violet-600 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-700"
                  : ""
              }
            >
              <Dumbbell className="h-4 w-4" />
              {t("bikes.addTrainer")}
            </Button>
          </div>

          <Button size="sm" onClick={() => router.push("/onboarding")}>
            <Plus className="h-4 w-4" />
            {t("bikes.addBike")}
          </Button>
        </div>
      </div>

      {/* Outdoor bikes */}
      {activeBikes.length > 0 && (
        <div className="space-y-3">
          {trainerBikes.length > 0 && (
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("nav.bikes")}
            </h2>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {activeBikes.map((bike) => (
              <Link key={bike.id} href={`/bikes/${bike.id}`}>
                <Card size="sm" className="transition-colors hover:border-primary/30">
                  <CardContent className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Bike className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{bike.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="capitalize text-[10px]">{t("bikes.bikeTypes." + bike.type)}</Badge>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Trainer bikes */}
      {trainerBikes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t("bikes.bikeTypes.trainer")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {trainerBikes.map((trainer) => {
              const linkedBike = activeBikes.find((b) => b.id === trainer.linkedBikeId);
              return (
                <Link key={trainer.id} href={`/bikes/${trainer.id}`}>
                  <Card size="sm" className="transition-colors hover:border-violet-500/30 border-violet-500/20 bg-violet-500/5">
                    <CardContent className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
                        <Dumbbell className="h-6 w-6 text-violet-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{trainer.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px] bg-violet-500/10 text-violet-600 border-violet-500/20">
                            {t("rides.indoor")}
                          </Badge>
                          {linkedBike && (
                            <span className="text-[10px] text-muted-foreground truncate">
                              {linkedBike.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Removed bikes — available for reactivation */}
      {inactiveBikes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t("bikes.removedSection")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {inactiveBikes.map((bike) => (
              <Card key={bike.id} size="sm" className="border-dashed opacity-60">
                <CardContent className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                    {bike.isTrainer ? (
                      <Dumbbell className="h-6 w-6 text-muted-foreground" />
                    ) : (
                      <Bike className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{bike.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {bike.isTrainer ? t("bikes.bikeTypes.trainer") : t("bikes.bikeTypes." + bike.type)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reactivating === bike.id}
                    onClick={() => handleReactivate(bike.id)}
                  >
                    {reactivating === bike.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    {t("bikes.reactivate")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
