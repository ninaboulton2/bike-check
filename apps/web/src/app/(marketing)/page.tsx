"use client";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Link2,
  Gauge,
  Bell,
  CloudRain,
  Bike,
  DollarSign,
  ChevronRight,
  Check,
  ArrowRight,
  Zap,
  Shield,
} from "lucide-react";
import Image from "next/image";
import { useTranslation } from "@/hooks/use-translation";

/* ─── Mock component card shown in the hero ─── */
function HeroComponentMock({ t }: { t: (key: string) => string }) {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* Decorative glow */}
      <div className="absolute -inset-4 rounded-3xl bg-primary/10 blur-2xl" />
      <div className="relative space-y-3">
        {/* Chain - critical */}
        <div className="rounded-xl border border-red-500/30 bg-[#1a1a1a] p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/20 text-xs">
                ⛓
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{t("landing.heroMock.chain")}</p>
                <p className="text-[11px] text-neutral-500">
                  {t("landing.heroMock.chainModel")}
                </p>
              </div>
            </div>
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] uppercase tracking-wider">
              {t("landing.heroMock.critical")}
            </Badge>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs">
              <span className="font-medium tabular-nums text-white">
                2,847 km
              </span>
              <span className="text-neutral-500">/ 3,000 km</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400"
                style={{ width: "95%" }}
              />
            </div>
            <p className="mt-2 text-[11px] text-red-400/90">
              {t("landing.heroMock.chainWarning")}
            </p>
          </div>
        </div>

        {/* Cassette - good */}
        <div className="rounded-xl border border-neutral-800 bg-[#1a1a1a] p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-xs">
                ⚙
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{t("landing.heroMock.cassette")}</p>
                <p className="text-[11px] text-neutral-500">
                  {t("landing.heroMock.cassetteModel")}
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] uppercase tracking-wider">
              {t("landing.heroMock.good")}
            </Badge>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs">
              <span className="font-medium tabular-nums text-white">
                2,847 km
              </span>
              <span className="text-neutral-500">/ 9,000 km</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                style={{ width: "32%" }}
              />
            </div>
          </div>
        </div>

        {/* Rear tire - approaching */}
        <div className="rounded-xl border border-neutral-800 bg-[#1a1a1a] p-4 opacity-70 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-500/20 text-xs">
                🛞
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{t("landing.heroMock.rearTire")}</p>
                <p className="text-[11px] text-neutral-500">{t("landing.heroMock.rearTireModel")}</p>
              </div>
            </div>
            <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-[10px] uppercase tracking-wider">
              73%
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Step card ─── */
function StepCard({
  step,
  icon: Icon,
  title,
  description,
}: {
  step: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {step}
        </span>
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

/* ─── Feature card ─── */
function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-border/60 bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

/* ─── FAQ item ─── */
function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="group border-b border-border/60 py-5 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold tracking-tight select-none">
        {question}
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground pr-8">
        {answer}
      </p>
    </details>
  );
}

/* ═══════════════════════════════════════════ */
/* ─── PAGE ─── */
/* ═══════════════════════════════════════════ */

export default function LandingPage() {
  const { t, locale, setLocale } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col">
      {/* ─── NAV ─── */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center">
            <Image src="/logo.png" alt="BikeCheck" width={52} height={52} className="shrink-0" />
            <span className="text-2xl font-bold tracking-tight"><span className="text-foreground">Bike</span><span className="text-primary">Check</span></span>
          </div>
          <nav className="hidden items-center gap-6 text-sm sm:flex">
            <a
              href="#how-it-works"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("landing.nav.howItWorks")}
            </a>
            <a
              href="#features"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("landing.nav.features")}
            </a>
            <a
              href="#pricing"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("landing.nav.pricing")}
            </a>
            <button
              onClick={() => setLocale(locale === "en" ? "fr" : "en")}
              className="text-sm font-medium"
            >
              {locale === "en" ? "FR" : "EN"}
            </button>
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocale(locale === "en" ? "fr" : "en")}
              className="text-sm font-medium sm:hidden"
            >
              {locale === "en" ? "FR" : "EN"}
            </button>
            <a href="/api/auth/strava" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
                <span>{t("landing.nav.connectStrava")}</span>
                <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-[#0c0c0c] text-white">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Gradient orb */}
        <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full bg-primary/10 blur-[100px]" />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-32">
          {/* Left — copy */}
          <div>
            <Badge
              variant="outline"
              className="mb-6 border-neutral-700 text-neutral-400 bg-neutral-900/50 text-[11px] tracking-wide"
            >
              {t("landing.hero.badge")}
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              {t("landing.hero.titleLine1")}
              <br />
              <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                {t("landing.hero.titleLine2")}
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-neutral-400 sm:text-lg">
              {t("landing.hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="/api/auth/strava" className={cn(buttonVariants({ size: "lg" }), "h-12 px-6 text-base font-semibold gap-1.5")}>
                  {t("landing.hero.cta")}
                  <ArrowRight className="ml-1 h-4 w-4" />
              </a>
              <p className="text-xs text-neutral-500 sm:ml-1">
                {t("landing.hero.ctaSubtext")}
              </p>
            </div>
            {/* Trust signals */}
            <div className="mt-10 flex items-center gap-6 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> {t("landing.hero.trustStrava")}
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> {t("landing.hero.trustSetup")}
              </span>
            </div>
          </div>

          {/* Right — mock UI */}
          <div className="hidden lg:block">
            <HeroComponentMock t={t} />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="bg-background py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-14 max-w-md">
            <Badge variant="secondary" className="mb-3 text-[11px] tracking-wide">
              {t("landing.howItWorks.badge")}
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("landing.howItWorks.title")}
            </h2>
          </div>
          <div className="grid gap-10 sm:grid-cols-3 sm:gap-8">
            <StepCard
              step={t("landing.howItWorks.step1Label")}
              icon={Link2}
              title={t("landing.howItWorks.step1Title")}
              description={t("landing.howItWorks.step1Desc")}
            />
            <StepCard
              step={t("landing.howItWorks.step2Label")}
              icon={Gauge}
              title={t("landing.howItWorks.step2Title")}
              description={t("landing.howItWorks.step2Desc")}
            />
            <StepCard
              step={t("landing.howItWorks.step3Label")}
              icon={Bell}
              title={t("landing.howItWorks.step3Title")}
              description={t("landing.howItWorks.step3Desc")}
            />
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="border-t border-border/40 bg-muted/30 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-14 max-w-md">
            <Badge variant="secondary" className="mb-3 text-[11px] tracking-wide">
              {t("landing.features.badge")}
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("landing.features.title")}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {t("landing.features.subtitle")}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={CloudRain}
              title={t("landing.features.feature1Title")}
              description={t("landing.features.feature1Desc")}
            />
            <FeatureCard
              icon={Gauge}
              title={t("landing.features.feature2Title")}
              description={t("landing.features.feature2Desc")}
            />
            <FeatureCard
              icon={DollarSign}
              title={t("landing.features.feature3Title")}
              description={t("landing.features.feature3Desc")}
            />
            <FeatureCard
              icon={Bike}
              title={t("landing.features.feature4Title")}
              description={t("landing.features.feature4Desc")}
            />
            <FeatureCard
              icon={Zap}
              title={t("landing.features.feature5Title")}
              description={t("landing.features.feature5Desc")}
            />
            <FeatureCard
              icon={Shield}
              title={t("landing.features.feature6Title")}
              description={t("landing.features.feature6Desc")}
            />
          </div>
        </div>
      </section>

      {/* ─── DASHBOARD PREVIEW (mobile showcase) ─── */}
      <section className="bg-background py-24 lg:hidden">
        <div className="mx-auto max-w-sm px-4">
          <div className="mb-8 text-center">
            <Badge variant="secondary" className="mb-3 text-[11px] tracking-wide">
              {t("landing.dashboard.badge")}
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">
              {t("landing.dashboard.title")}
            </h2>
          </div>
          <HeroComponentMock t={t} />
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="border-t border-border/40 bg-muted/30 py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <Badge variant="secondary" className="mb-3 text-[11px] tracking-wide">
              {t("landing.pricing.badge")}
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("landing.pricing.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              {t("landing.pricing.subtitle")}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Free */}
            <Card className="relative">
              <CardHeader>
                <CardTitle className="text-lg">{t("landing.pricing.free")}</CardTitle>
                <CardDescription>
                  {t("landing.pricing.freeDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-3xl font-bold">{t("landing.pricing.freePrice")}</span>
                  <span className="text-sm text-muted-foreground">
                    {t("landing.pricing.perMonth")}
                  </span>
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{t("landing.pricing.freeBullet1")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{t("landing.pricing.freeBullet2")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{t("landing.pricing.freeBullet3")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{t("landing.pricing.freeBullet4")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{t("landing.pricing.freeBullet5")}</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <a href="/api/auth/strava" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>{t("landing.pricing.getStarted")}</a>
              </CardFooter>
            </Card>

            {/* Pro */}
            <Card className="relative border-primary/40 shadow-lg shadow-primary/5 overflow-visible">
              <div className="absolute -top-3 right-4">
                <Badge className="text-[10px] uppercase tracking-wider">
                  {t("landing.pricing.recommended")}
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-lg">{t("landing.pricing.pro")}</CardTitle>
                <CardDescription>
                  {t("landing.pricing.proDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-1">
                  <span className="text-3xl font-bold">{t("landing.pricing.proPrice")}</span>
                  <span className="text-sm text-muted-foreground">
                    {t("landing.pricing.perMonth")}
                  </span>
                </div>
                <p className="mb-6 text-xs text-muted-foreground">
                  {t("landing.pricing.proYearly")}
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{t("landing.pricing.proBullet1")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{t("landing.pricing.proBullet2")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{t("landing.pricing.proBullet3")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{t("landing.pricing.proBullet4")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{t("landing.pricing.proBullet5")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{t("landing.pricing.proBullet6")}</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <a href="/api/auth/strava" className={cn(buttonVariants(), "w-full")}>{t("landing.pricing.startFree")}</a>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="bg-background py-24">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight">
              {t("landing.faq.title")}
            </h2>
          </div>
          <div>
            <FaqItem
              question={t("landing.faq.q1")}
              answer={t("landing.faq.a1")}
            />
            <FaqItem
              question={t("landing.faq.q2")}
              answer={t("landing.faq.a2")}
            />
            <FaqItem
              question={t("landing.faq.q3")}
              answer={t("landing.faq.a3")}
            />
            <FaqItem
              question={t("landing.faq.q4")}
              answer={t("landing.faq.a4")}
            />
            <FaqItem
              question={t("landing.faq.q5")}
              answer={t("landing.faq.a5")}
            />
            <FaqItem
              question={t("landing.faq.q6")}
              answer={t("landing.faq.a6")}
            />
          </div>
        </div>
      </section>

      {/* ─── BOTTOM CTA ─── */}
      <section className="border-t border-border/40 bg-[#0c0c0c] py-20 text-white">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("landing.cta.titlePrefix")}{" "}
            <span className="text-primary">{t("landing.cta.titleDistance")}</span>.
            <br />
            {t("landing.cta.titleSuffix")}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-neutral-400">
            {t("landing.cta.subtitle")}
          </p>
          <a href="/api/auth/strava" className={cn(buttonVariants({ size: "lg" }), "mt-8 h-12 px-8 text-base font-semibold gap-1.5")}>
              {t("landing.cta.button")}
              <ArrowRight className="ml-1 h-4 w-4" />
          </a>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border/40 bg-background py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <div className="flex items-center text-sm text-muted-foreground">
            <Image src="/logo.png" alt="BikeCheck" width={38} height={38} className="shrink-0 opacity-60" />
            <span className="text-sm font-bold tracking-tight opacity-60"><span className="text-foreground">Bike</span><span className="text-primary">Check</span></span>
          </div>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              {t("landing.footer.privacy")}
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              {t("landing.footer.terms")}
            </a>
          </div>
          <p className="text-xs text-muted-foreground/60">
            {t("landing.footer.tagline")}
          </p>
        </div>
      </footer>
    </div>
  );
}
