import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { useRole, useSession } from "@/hooks/useAuth";
import { navForRole } from "@/lib/nav";
import { useClasses, useAssignments } from "@/lib/data";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: role } = useRole(user?.id);
  const { data: classes } = useClasses();
  const { data: assignments } = useAssignments();
  const items = navForRole(role ?? "student");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(to: string) {
    setOpen(false);
    navigate({ to });
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, classes, assignments…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Pages">
          {items.map((i) => (
            <CommandItem key={i.to} onSelect={() => go(i.to)}>
              <i.icon className="mr-2 h-4 w-4" /> {i.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {classes && classes.length > 0 && (
          <CommandGroup heading="Classes">
            {classes.map((c) => (
              <CommandItem key={c.id} onSelect={() => go("/classes")}>{c.name}{c.subject ? ` · ${c.subject}` : ""}</CommandItem>
            ))}
          </CommandGroup>
        )}
        {assignments && assignments.length > 0 && (
          <CommandGroup heading="Assignments">
            {assignments.slice(0, 10).map((a) => (
              <CommandItem key={a.id} onSelect={() => go("/assignments")}>{a.title}{a.class_name ? ` · ${a.class_name}` : ""}</CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
