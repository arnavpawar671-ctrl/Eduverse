import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Plus, KeyRound, Users, FileText, Video, Copy } from "lucide-react";
import { toast } from "sonner";
import { useSession, useRole } from "@/hooks/useAuth";
import { PageHeader } from "@/components/dashboard-bits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/classes")({
  head: () => ({ meta: [{ title: "Classes — EduVerse" }] }),
  component: ClassesPage,
});

const CLASSES = [
  { name: "Mathematics 10-A", teacher: "Ms. Rao", students: 32, color: "from-[#4a90e2] to-[#7b61ff]", code: "MATH10A" },
  { name: "History 9-B", teacher: "Mr. Khan", students: 28, color: "from-[#7b61ff] to-[#4a90e2]", code: "HIST9B" },
  { name: "Biology 11-C", teacher: "Dr. Mehta", students: 24, color: "from-[#4caf50] to-[#4a90e2]", code: "BIO11C" },
  { name: "Physics 12-A", teacher: "Ms. Iyer", students: 21, color: "from-[#ff9800] to-[#f44336]", code: "PHY12A" },
];

function ClassesPage() {
  const { user } = useSession();
  const { data: role } = useRole(user?.id);
  const isTeacher = role === "teacher" || role === "admin";
  const [code, setCode] = useState("");

  return (
    <div>
      <PageHeader
        title="Classes"
        subtitle={isTeacher ? "Create and manage your classes." : "Your enrolled classes and materials."}
        action={
          isTeacher ? (
            <Button variant="hero" onClick={() => toast.success("Class created! Share code to enroll students.")}>
              <Plus className="h-4 w-4" /> Create class
            </Button>
          ) : undefined
        }
      />

      {!isTeacher && (
        <Card className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border-border p-4 shadow-soft">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-primary">
            <KeyRound className="h-5 w-5" />
          </span>
          <div className="min-w-[180px] flex-1">
            <p className="text-sm font-semibold">Join a class</p>
            <p className="text-xs text-muted-foreground">Enter the class code from your teacher.</p>
          </div>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. MATH10A"
              className="w-36"
            />
            <Button
              onClick={() =>
                code ? toast.success(`Joined class ${code}!`) : toast.error("Enter a class code")
              }
            >
              Join
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CLASSES.map((c) => (
          <Card key={c.code} className="overflow-hidden rounded-2xl border-border shadow-soft transition-transform hover:-translate-y-1">
            <div className={`h-24 bg-gradient-to-br ${c.color} p-4`}>
              <BookOpen className="h-6 w-6 text-white/90" />
            </div>
            <div className="p-4">
              <h3 className="font-semibold">{c.name}</h3>
              <p className="text-xs text-muted-foreground">{c.teacher}</p>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {c.students}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> 12 notes
                </span>
                <span className="flex items-center gap-1">
                  <Video className="h-3.5 w-3.5" /> 5 videos
                </span>
              </div>
              {isTeacher && (
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(c.code);
                    toast.success(`Code ${c.code} copied`);
                  }}
                  className="mt-3 flex w-full items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs font-medium"
                >
                  <span>Code: {c.code}</span>
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
