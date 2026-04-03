"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wrench,
  Route,
  Settings,
  Menu,
  LogOut,
  Bike,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useTranslation } from "@/hooks/use-translation";

const NAV_KEYS = [
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/bikes", key: "nav.bikes", icon: Bike },
  { href: "/maintenance", key: "nav.maintenance", icon: Wrench },
  { href: "/rides", key: "nav.rides", icon: Route },
  { href: "/settings", key: "nav.settings", icon: Settings },
];

interface AppNavProps {
  user: {
    name: string;
    email?: string;
    avatarUrl?: string;
    plan: string;
  };
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_KEYS.map(({ href, key, icon: Icon }) => {
        const label = t(key);
        const isActive = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar({ user }: AppNavProps) {
  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border bg-card">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 px-6">
          <Image src="/logo.png" alt="BikeCheck" width={52} height={52} className="shrink-0" />
          <span className="text-2xl font-bold tracking-tight"><span className="text-foreground">Bike</span><span className="text-primary">Check</span></span>
        </div>

        <Separator />

        {/* Nav */}
        <div className="flex-1 px-3 py-4">
          <NavLinks />
        </div>

        <Separator />

        {/* User */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback>
                {user.name?.charAt(0)?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <Badge
                variant={user.plan === "pro" ? "default" : "secondary"}
                className="mt-0.5 text-[10px] px-1.5 py-0"
              >
                {user.plan.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function AppHeader({ user }: AppNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-card px-4 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" className="-ml-2" />}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center gap-2 px-6">
              <Image src="/logo.png" alt="BikeCheck" width={34} height={34} className="shrink-0" />
              <span className="text-lg font-bold tracking-tight">
                BikeCheck
              </span>
            </div>
            <Separator />
            <div className="flex-1 px-3 py-4">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <Separator />
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback>
                    {user.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <Badge
                    variant={user.plan === "pro" ? "default" : "secondary"}
                    className="mt-0.5 text-[10px] px-1.5 py-0"
                  >
                    {user.plan.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex items-center">
        <Image src="/logo.png" alt="BikeCheck" width={44} height={44} className="shrink-0" />
        <span className="text-xl font-bold tracking-tight"><span className="text-foreground">Bike</span><span className="text-primary">Check</span></span>
      </div>

      <div className="ml-auto">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.avatarUrl} alt={user.name} />
          <AvatarFallback>
            {user.name?.charAt(0)?.toUpperCase() ?? "U"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
