import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Award, Flame, Coins, Zap, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useProfile, useRole } from "@/hooks/useAuth";
import { ROLE_LABEL } from "@/lib/nav";
import { PageHeader } from "@/components/dashboard-bits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — EduVerse" }] }),
  component: ProfilePage,
});

type Badge = {
  label: string;
  icon: typeof Flame;
  tone: string;
  earned: (p: { xp: number; coins: number; streak: number }) => boolean;
  goal: string;
};

const BADGES: Badge[] = [
  { label: "7-Day Streak", icon: Flame, tone: "bg-warning/10 text-warning", earned: (p) => p.streak >= 7, goal: "Reach a 7-day streak" },
  { label: "Rising Star", icon: Award, tone: "bg-success/10 text-success", earned: (p) => p.xp >= 500, goal: "Earn 500 XP" },
  { label: "Fast Learner", icon: Zap, tone: "bg-primary/10 text-primary", earned: (p) => p.xp >= 100, goal: "Earn 100 XP" },
  { label: "Coin Master", icon: Coins, tone: "bg-secondary/10 text-secondary", earned: (p) => p.coins >= 100, goal: "Collect 100 coins" },
];

function ProfilePage() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const { data: role } = useRole(user?.id);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ full_name: "", school: "", grade: "", section: "", bio: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        school: profile.school ?? "",
        grade: profile.grade ?? "",
        section: profile.section ?? "",
        bio: profile.bio ?? "",
      });
    }
  }, [profile]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated!");
    queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
  }

  return (
    <div>
      <PageHeader title="Profile" subtitle="Manage your account and view your achievements." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl border-border p-6 text-center shadow-soft">
          <Avatar className="mx-auto h-24 w-24">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-brand text-2xl font-bold text-white">
              {(profile?.full_name ?? "EV").split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </AvatarFallback>
          </Avatar>
          <h3 className="mt-4 text-lg font-semibold">{profile?.full_name ?? "—"}</h3>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
          <span className="mt-2 inline-block rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-primary">
            {ROLE_LABEL[role ?? "student"]}
          </span>

          <div className="mt-6 grid grid-cols-3 gap-2">
            <Stat label="XP" value={profile?.xp ?? 0} />
            <Stat label="Coins" value={profile?.coins ?? 0} />
            <Stat label="Streak" value={profile?.streak ?? 0} />
          </div>
        </Card>

        <Card className="rounded-2xl border-border p-6 shadow-soft lg:col-span-2">
          <h3 className="mb-4 font-semibold">Edit details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
            <Field label="School" value={form.school} onChange={(v) => setForm({ ...form, school: v })} />
            <Field label="Grade" value={form.grade} onChange={(v) => setForm({ ...form, grade: v })} />
            <Field label="Section" value={form.section} onChange={(v) => setForm({ ...form, section: v })} />
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell us about yourself…"
            />
          </div>
          <Button variant="hero" className="mt-5" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
          </Button>
        </Card>

        <Card className="rounded-2xl border-border p-6 shadow-soft lg:col-span-3">
          <h3 className="mb-4 font-semibold">Achievements</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BADGES.map((b) => (
              <div key={b.label} className="flex flex-col items-center gap-2 rounded-2xl border border-border p-4 text-center">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${b.tone}`}>
                  <b.icon className="h-6 w-6" />
                </span>
                <span className="text-xs font-medium">{b.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted py-3">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
