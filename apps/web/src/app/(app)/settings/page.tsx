"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, LogOut, Loader2, Sun, Moon, Monitor, Link2, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "@/hooks/use-translation";
import type { Locale } from "@bike-check/shared";

interface UserSettings {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  plan: string;
  alertEmail: boolean;
  alertLevels: string[];
  currency: string;
  theme: string;
  language: string;
}

const CURRENCY_OPTIONS = [
  { value: "EUR", label: "Euro (€)" },
  { value: "USD", label: "US Dollar ($)" },
  { value: "GBP", label: "British Pound (£)" },
];

export default function SettingsPage() {
  const [user, setUser] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savedEmail, setSavedEmail] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { setTheme } = useTheme();
  const { t, setLocale } = useTranslation();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: UserSettings) => {
        setUser(data);
        setEditEmail(data.email ?? "");
        if (data.theme) setTheme(data.theme);
      });
    // Fetch latest ride date for last sync
    fetch("/api/rides?limit=1")
      .then((r) => r.json())
      .then((rides: { date: string }[]) => {
        if (rides.length > 0) setLastSync(rides[0].date);
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        alertEmail: user.alertEmail,
        alertLevels: user.alertLevels,
        currency: user.currency,
        theme: user.theme,
        language: user.language,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTheme(user.theme);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSaveEmail() {
    if (!user) return;
    setSavingEmail(true);
    setSavedEmail(false);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: editEmail }),
    });
    setUser({ ...user, email: editEmail });
    setSavingEmail(false);
    setSavedEmail(true);
    setTimeout(() => setSavedEmail(false), 2000);
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    await fetch("/api/auth/me", { method: "DELETE" });
    window.location.href = "/";
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("settings.subtitle")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("settings.profile")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>
                  {user.name?.charAt(0)?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{user.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {user.email ?? t("settings.noEmail")}
                </p>
              </div>
              <Badge
                variant={user.plan === "pro" ? "default" : "secondary"}
                className="shrink-0 text-[10px] uppercase tracking-wider"
              >
                {user.plan}
              </Badge>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="edit-email" className="text-sm">{t("settings.email")}</Label>
              <p className="text-xs text-muted-foreground">{t("settings.emailDescription")}</p>
              <div className="flex gap-2">
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="flex-1"
                />
                <Button size="sm" onClick={handleSaveEmail} disabled={savingEmail}>
                  {savingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : savedEmail ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    t("common.save")
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strava Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("settings.stravaConnection")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-sm">
                {t("settings.connectedAs", { name: user.name ?? "Unknown" })}
              </span>
            </div>
            {lastSync && (
              <p className="text-xs text-muted-foreground">
                {t("settings.lastSync")}: {new Date(lastSync).toLocaleDateString()}
              </p>
            )}
            <div className="flex items-center gap-2">
              <a href="/api/auth/strava">
                <Button variant="outline" size="sm" type="button">
                  <Link2 className="h-3.5 w-3.5 mr-1" />
                  {t("settings.reconnect")}
                </Button>
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("settings.disconnectNote")}
            </p>
          </CardContent>
        </Card>

        {/* Currency */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("settings.currency")}</CardTitle>
            <CardDescription>
              {t("settings.currencyDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={user.currency}
              onValueChange={(value) => {
                if (value) setUser({ ...user, currency: value });
              }}
            >
              <SelectTrigger>
                <span>
                  {CURRENCY_OPTIONS.find((o) => o.value === user.currency)?.label ?? "Select currency"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("settings.appearance")}</CardTitle>
            <CardDescription>
              {t("settings.appearanceDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "light", labelKey: "settings.light", Icon: Sun },
                  { value: "dark", labelKey: "settings.dark", Icon: Moon },
                  { value: "system", labelKey: "settings.system", Icon: Monitor },
                ] as const
              ).map(({ value, labelKey, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setUser({ ...user, theme: value });
                    setTheme(value);
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm transition-colors ${
                    user.theme === value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("settings.language")}</CardTitle>
            <CardDescription>
              {t("settings.languageDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "en" as Locale, label: "English", flag: "🇬🇧" },
                  { value: "fr" as Locale, label: "Français", flag: "🇫🇷" },
                ] as const
              ).map(({ value, label, flag }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setUser({ ...user, language: value });
                    setLocale(value);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                    user.language === value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <span className="text-lg">{flag}</span>
                  {label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alert preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("settings.emailAlerts")}</CardTitle>
            <CardDescription>
              {t("settings.emailAlertsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="alert-email" className="text-sm">
                {t("settings.receiveAlerts")}
              </Label>
              <Switch
                id="alert-email"
                checked={user.alertEmail}
                onCheckedChange={(checked) =>
                  setUser({ ...user, alertEmail: checked })
                }
              />
            </div>
            {user.alertEmail && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("settings.alertLevels")}
                  </p>
                  {(["warning", "critical", "overdue"] as const).map((level) => (
                    <div key={level} className="flex items-center gap-3">
                      <Checkbox
                        id={`alert-${level}`}
                        checked={user.alertLevels.includes(level)}
                        onCheckedChange={(checked) => {
                          const levels = checked
                            ? [...user.alertLevels, level]
                            : user.alertLevels.filter((l) => l !== level);
                          setUser({ ...user, alertLevels: levels });
                        }}
                      />
                      <Label
                        htmlFor={`alert-${level}`}
                        className="text-sm capitalize"
                      >
                        {t("settings." + level + "Level")}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {level === "warning" && t("settings.warningRange")}
                          {level === "critical" && t("settings.criticalRange")}
                          {level === "overdue" && t("settings.overdueRange")}
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("common.saving")}
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4" />
              {t("common.saved")}
            </>
          ) : (
            t("common.save")
          )}
        </Button>
        {saved && (
          <span className="text-sm text-emerald-600">
            {t("common.settingsSaved")}
          </span>
        )}
      </div>

      {/* Danger zone */}
      <Separator />
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="text-base text-red-600">{t("settings.dangerZone")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <LogOut className="h-4 w-4" />
              {t("settings.signOut")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t("settings.deleteAccount")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete account confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={(v: boolean) => { if (!v) setDeleteOpen(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("settings.deleteAccountConfirm")}</DialogTitle>
            <DialogDescription>
              {t("settings.deleteAccountDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t("settings.deleteAccount")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
