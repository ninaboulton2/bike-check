import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db, users } from "@bike-check/db";
import { eq } from "drizzle-orm";
import { AppSidebar, AppHeader } from "@/components/app-nav";
import { ThemeSync } from "@/components/theme-sync";
import { LanguageSync } from "@/components/language-sync";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const [user] = await db
    .select({
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      plan: users.plan,
      theme: users.theme,
      language: users.language,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  const navUser = {
    name: user?.name ?? "Cyclist",
    email: user?.email ?? undefined,
    avatarUrl: user?.avatarUrl ?? undefined,
    plan: user?.plan ?? "free",
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <ThemeSync theme={user?.theme ?? "system"} />
      <LanguageSync language={user?.language ?? "en"} />
      <AppSidebar user={navUser} />
      <div className="flex flex-1 flex-col">
        <AppHeader user={navUser} />
        <main className="flex-1 px-4 py-8 lg:px-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
