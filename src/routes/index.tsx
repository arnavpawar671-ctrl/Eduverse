import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  ClipboardList,
  CalendarDays,
  BarChart3,
  MessagesSquare,
  ShieldCheck,
  ArrowRight,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-eduverse.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
});

const FEATURES = [
  { icon: BookOpen, title: "Smart Classrooms", desc: "Notes, PDFs, videos and recorded lectures in one organized place. Join with a class code." },
  { icon: Sparkles, title: "AI Tutor", desc: "Explanations, quizzes, summaries, math and code help — a 24/7 study companion." },
  { icon: ClipboardList, title: "Assignments & Grading", desc: "Submit any file, track deadlines, and get rubric-based feedback and marks." },
  { icon: CalendarDays, title: "Calendar & Attendance", desc: "Classes, exams, holidays and attendance with smart reminders." },
  { icon: BarChart3, title: "Analytics", desc: "Performance trends, weak topics, and class insights for students and teachers." },
  { icon: MessagesSquare, title: "Chat & Announcements", desc: "Class groups, private messages, file sharing and rich announcements." },
];

const ROLES = [
  { title: "For Students", points: ["Join classes & access materials", "Submit assignments & track grades", "AI study tools & flashcards", "Streaks, XP and achievements"] },
  { title: "For Teachers", points: ["Create classes & class codes", "Build assignments & quizzes", "Take attendance & grade fast", "Class analytics & AI exam generator"] },
];

function Landing() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-glow">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-bold">EduVerse</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#roles" className="transition-colors hover:text-foreground">For you</a>
            <a href="#platforms" className="transition-colors hover:text-foreground">Platforms</a>
          </nav>
          {signedIn ? (
            <Button variant="hero" size="pill" onClick={() => navigate({ to: "/dashboard" })}>
              Open app <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="pill" onClick={() => navigate({ to: "/auth" })}>
                Sign in
              </Button>
              <Button variant="hero" size="pill" onClick={() => navigate({ to: "/auth" })}>
                Get started
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ backgroundImage: "var(--gradient-hero)" }}>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-primary shadow-sm">
              <Sparkles className="h-3.5 w-3.5" /> AI-Powered Learning Ecosystem
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
              The <span className="text-gradient">smart platform</span> for modern classrooms
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
              EduVerse brings classes, assignments, an AI tutor, attendance and analytics into one
              clean, secure experience — for students and teachers alike.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="hero" size="lg" onClick={() => navigate({ to: signedIn ? "/dashboard" : "/auth" })}>
                {signedIn ? "Open dashboard" : "Start for free"} <ArrowRight className="h-5 w-5" />
              </Button>
              <a href="#features">
                <Button variant="outline" size="lg">Explore features</Button>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> No setup required</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> Secure & private</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> Web, mobile & desktop</span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-brand-soft blur-2xl" />
            <img
              src={heroImg}
              alt="EduVerse AI learning dashboard preview"
              className="relative w-full rounded-3xl border border-border shadow-soft"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Everything school needs, reimagined</h2>
          <p className="mt-3 text-muted-foreground">
            Replace scattered chats, email and paper with one intelligent, delightful platform.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-primary transition-colors group-hover:bg-brand group-hover:text-white">
                <f.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="bg-brand-soft py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Built for everyone in the classroom</h2>
            <p className="mt-3 text-muted-foreground">Choose your role at sign-up and get a tailored experience.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {ROLES.map((r) => (
              <div key={r.title} className="rounded-3xl border border-border bg-card p-8 shadow-soft">
                <h3 className="text-xl font-bold">{r.title}</h3>
                <ul className="mt-5 space-y-3">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-center gap-3 text-sm">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section id="platforms" className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
        <div className="grid items-center gap-8 rounded-3xl border border-border bg-card p-8 shadow-soft lg:grid-cols-2 lg:p-12">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure by design
            </span>
            <h2 className="mt-4 text-3xl font-bold">Available everywhere you learn</h2>
            <p className="mt-3 text-muted-foreground">
              A single account across Web, Android, iOS and Windows — with encrypted data,
              role-based access, and lightning-fast sync.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Web", "Android", "iOS", "Windows"].map((p) => (
                <span key={p} className="rounded-full border border-border px-4 py-1.5 text-sm font-medium">{p}</span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-brand p-8 text-center text-white shadow-glow">
            <Sparkles className="mx-auto h-10 w-10" />
            <h3 className="mt-4 text-2xl font-bold">Ready to transform learning?</h3>
            <p className="mt-2 text-white/85">Join EduVerse and bring your classroom into the future.</p>
            <Button
              variant="secondary"
              size="lg"
              className="mt-6"
              onClick={() => navigate({ to: signedIn ? "/dashboard" : "/auth" })}
            >
              {signedIn ? "Open dashboard" : "Create your account"} <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white">
              <GraduationCap className="h-4 w-4" />
            </span>
            <span className="font-display font-semibold text-foreground">EduVerse</span>
          </div>
          <p>© {new Date().getFullYear()} EduVerse. AI-powered learning for everyone.</p>
          <Link to="/auth" className="font-medium text-primary">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
