import { type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { GraduationCap, LogOut, Flame, Coins, Search, Moon, Sun, Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useProfile, useRole } from "@/hooks/useAuth";
import { navForRole, ROLE_LABEL } from "@/lib/nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationBell } from "@/components/notification-bell";
import { CommandPalette } from "@/components/command-palette";
import { useTheme } from "@/hooks/useTheme";
import { useI18n, type Lang } from "@/lib/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function initials(name?: string | null) {
  if (!name) return "EV";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const { data: role, isLoading: roleLoading } = useRole(user?.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = navForRole(role ?? "student");

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center gap-2 px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-glow">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold">EduVerse</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 no-scrollbar">
          {items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-soft text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-brand-soft text-primary text-xs font-semibold">
                {initials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{profile?.full_name ?? "Loading…"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {roleLoading ? "…" : ROLE_LABEL[role ?? "student"]}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Topbar */}
      <header className="fixed inset-x-0 top-0 z-30 h-16 border-b border-border glass lg:pl-64">
        <div className="flex h-full items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
              <GraduationCap className="h-4 w-4" />
            </span>
            <span className="font-display font-bold">EduVerse</span>
          </div>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-1.5">
            <SearchTrigger />
            {profile ? (
              <>
                <span className="hidden items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning sm:inline-flex">
                  <Flame className="h-3.5 w-3.5" /> {profile.streak}
                </span>
                <span className="hidden items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-secondary sm:inline-flex">
                  <Coins className="h-3.5 w-3.5" /> {profile.coins}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                  {profile.xp} XP
                </span>
              </>
            ) : (
              <Skeleton className="h-8 w-24 rounded-full" />
            )}
            <LanguageMenu />
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>
      </header>
      <CommandPalette />

      {/* Main */}
      <main className="px-4 pb-28 pt-20 sm:px-6 lg:pb-10 lg:pl-[17.5rem] lg:pr-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border glass lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          {items.slice(0, 5).map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
