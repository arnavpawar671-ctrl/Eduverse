import { createFileRoute } from "@tanstack/react-router";
import { Trophy, Flame, Coins } from "lucide-react";
import { PageHeader } from "@/components/dashboard-bits";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLeaderboard } from "@/lib/games";
import { useSession } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — EduVerse" }] }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { data: rows } = useLeaderboard();
  const { user } = useSession();
  const podium = rows?.slice(0, 3) ?? [];
  const rest = rows?.slice(3) ?? [];

  return (
    <div>
      <PageHeader title="Leaderboard" subtitle="Top learners this season." />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {podium.map((p, i) => (
          <Card key={p.id} className={`rounded-2xl border-border p-5 text-center shadow-soft ${i === 0 ? "bg-brand-soft" : ""}`}>
            <Trophy className={`mx-auto h-6 w-6 ${i === 0 ? "text-warning" : i === 1 ? "text-muted-foreground" : "text-secondary"}`} />
            <p className="mt-2 text-xs font-semibold text-muted-foreground">#{i + 1}</p>
            <Avatar className="mx-auto mt-2 h-14 w-14"><AvatarImage src={p.avatar_url ?? undefined} /><AvatarFallback>{p.full_name?.[0] ?? "?"}</AvatarFallback></Avatar>
            <p className="mt-2 font-semibold">{p.full_name ?? "Learner"}</p>
            <p className="text-sm text-primary font-bold">{p.xp} XP</p>
          </Card>
        ))}
      </div>
      <Card className="rounded-2xl border-border shadow-soft">
        <ul className="divide-y divide-border">
          {rest.map((p, i) => (
            <li key={p.id} className={`flex items-center gap-3 p-4 ${p.id === user?.id ? "bg-brand-soft" : ""}`}>
              <span className="w-8 text-sm font-semibold text-muted-foreground">#{i + 4}</span>
              <Avatar className="h-9 w-9"><AvatarImage src={p.avatar_url ?? undefined} /><AvatarFallback>{p.full_name?.[0] ?? "?"}</AvatarFallback></Avatar>
              <div className="flex-1 truncate">
                <p className="truncate text-sm font-medium">{p.full_name ?? "Learner"}</p>
              </div>
              <span className="flex items-center gap-1 text-xs text-warning"><Flame className="h-3 w-3" /> {p.streak}</span>
              <span className="flex items-center gap-1 text-xs text-secondary"><Coins className="h-3 w-3" /> {p.coins}</span>
              <span className="w-16 text-right text-sm font-bold text-primary">{p.xp} XP</span>
            </li>
          ))}
          {rest.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Take a quiz or submit an assignment to climb up!</li>}
        </ul>
      </Card>
    </div>
  );
}
