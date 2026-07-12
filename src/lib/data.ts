import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";

/* ============================ Types ============================ */
export type ClassRow = {
  id: string;
  teacher_id: string;
  name: string;
  subject: string | null;
  description: string | null;
  color: string;
  join_code: string;
  created_at: string;
};

export type ClassWithMeta = ClassRow & {
  student_count: number;
  teacher_name: string | null;
};

export type AssignmentRow = {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  points: number;
  created_at: string;
};

export type SubmissionRow = {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string | null;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
};

export type AssignmentWithMeta = AssignmentRow & {
  class_name: string | null;
  class_subject: string | null;
  submissions: SubmissionRow[];
};

export type CalendarEventRow = {
  id: string;
  owner_id: string;
  class_id: string | null;
  title: string;
  description: string | null;
  event_date: string;
  type: string;
};

/* ============================ Classes ============================ */
export function useClasses() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["classes", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ClassWithMeta[]> => {
      const { data, error } = await supabase
        .from("classes")
        .select("*, class_enrollments(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as (ClassRow & { class_enrollments: { count: number }[] })[];

      const teacherIds = Array.from(new Set(rows.map((r) => r.teacher_id)));
      const nameMap = new Map<string, string | null>();
      if (teacherIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", teacherIds);
        (profs ?? []).forEach((p) => nameMap.set(p.id, p.full_name));
      }

      return rows.map((r) => ({
        ...r,
        student_count: r.class_enrollments?.[0]?.count ?? 0,
        teacher_name: nameMap.get(r.teacher_id) ?? null,
      }));
    },
  });
}

export function useCreateClass() {
  const { user } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; subject?: string; description?: string; color?: string }) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("classes")
        .insert({
          teacher_id: user.id,
          name: input.name,
          subject: input.subject || null,
          description: input.description || null,
          ...(input.color ? { color: input.color } : {}),
        })
        .select()
        .single();
      if (error) throw error;
      return data as ClassRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classes"] }),
  });
}

export function useJoinClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc("join_class_by_code", { _code: code.trim() });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      qc.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
}

/* ============================ Assignments ============================ */
export function useAssignments() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["assignments", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<AssignmentWithMeta[]> => {
      const { data, error } = await supabase
        .from("assignments")
        .select("*, classes(name, subject), submissions(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as (AssignmentRow & {
        classes: { name: string; subject: string | null } | null;
        submissions: SubmissionRow[];
      })[]).map((a) => ({
        ...a,
        class_name: a.classes?.name ?? null,
        class_subject: a.classes?.subject ?? null,
        submissions: a.submissions ?? [],
      }));
    },
  });
}

export function useCreateAssignment() {
  const { user } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      class_id: string;
      title: string;
      description?: string;
      due_date?: string | null;
      points?: number;
    }) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("assignments")
        .insert({
          class_id: input.class_id,
          teacher_id: user.id,
          title: input.title,
          description: input.description || null,
          due_date: input.due_date || null,
          points: input.points ?? 100,
        })
        .select()
        .single();
      if (error) throw error;
      return data as AssignmentRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }),
  });
}

export function useSubmitAssignment() {
  const { user } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { assignment_id: string; content: string }) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("submissions")
        .upsert(
          {
            assignment_id: input.assignment_id,
            student_id: user.id,
            content: input.content,
            submitted_at: new Date().toISOString(),
          },
          { onConflict: "assignment_id,student_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as SubmissionRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }),
  });
}

export function useGradeSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { submission_id: string; grade: number; feedback?: string }) => {
      const { data, error } = await supabase
        .from("submissions")
        .update({
          grade: input.grade,
          feedback: input.feedback || null,
          graded_at: new Date().toISOString(),
        })
        .eq("id", input.submission_id)
        .select()
        .single();
      if (error) throw error;
      return data as SubmissionRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }),
  });
}

/* ============================ Calendar ============================ */
export function useCalendarEvents() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["calendar_events", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<CalendarEventRow[]> => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .order("event_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CalendarEventRow[];
    },
  });
}

export function useCreateEvent() {
  const { user } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; event_date: string; type: string; description?: string }) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("calendar_events")
        .insert({
          owner_id: user.id,
          title: input.title,
          event_date: input.event_date,
          type: input.type,
          description: input.description || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CalendarEventRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar_events"] }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar_events"] }),
  });
}
