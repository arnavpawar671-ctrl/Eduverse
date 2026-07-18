import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";

/* ============================ Notifications ============================ */
export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

export function useNotifications() {
  const { user } = useSession();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  return query;
}

export function useMarkNotificationsRead() {
  const { user } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids?: string[]) => {
      let q = supabase.from("notifications").update({ read: true }).eq("user_id", user!.id).eq("read", false);
      if (ids?.length) q = q.in("id", ids);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });
}

/* ============================ Announcements ============================ */
export type AnnouncementRow = {
  id: string;
  class_id: string | null;
  author_id: string;
  title: string;
  body: string;
  created_at: string;
  class_name?: string | null;
  author_name?: string | null;
};

export function useAnnouncements() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["announcements", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<AnnouncementRow[]> => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*, classes(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = (data ?? []) as (AnnouncementRow & { classes: { name: string } | null })[];
      const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
      const map = new Map<string, string | null>();
      if (authorIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", authorIds);
        (profs ?? []).forEach((p) => map.set(p.id, p.full_name));
      }
      return rows.map((r) => ({
        ...r,
        class_name: r.classes?.name ?? null,
        author_name: map.get(r.author_id) ?? null,
      }));
    },
  });
}

export function useCreateAnnouncement() {
  const { user } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; body: string; class_id: string | null }) => {
      const { data, error } = await supabase
        .from("announcements")
        .insert({ author_id: user!.id, title: input.title, body: input.body, class_id: input.class_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

/* ============================ Materials ============================ */
export type MaterialRow = {
  id: string;
  class_id: string;
  uploader_id: string;
  title: string;
  description: string | null;
  kind: "file" | "link";
  file_path: string | null;
  url: string | null;
  mime: string | null;
  size_bytes: number | null;
  created_at: string;
};

export function useMaterials(class_id?: string) {
  return useQuery({
    queryKey: ["materials", class_id],
    enabled: !!class_id,
    queryFn: async (): Promise<MaterialRow[]> => {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .eq("class_id", class_id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MaterialRow[];
    },
  });
}

export function useAddMaterial() {
  const { user } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      class_id: string;
      title: string;
      description?: string;
      kind: "file" | "link";
      url?: string;
      file?: File;
    }) => {
      let file_path: string | null = null;
      let mime: string | null = null;
      let size_bytes: number | null = null;
      if (input.kind === "file" && input.file) {
        const path = `${input.class_id}/${Date.now()}-${input.file.name}`;
        const { error: upErr } = await supabase.storage.from("materials").upload(path, input.file);
        if (upErr) throw upErr;
        file_path = path;
        mime = input.file.type;
        size_bytes = input.file.size;
      }
      const { error } = await supabase.from("materials").insert({
        class_id: input.class_id,
        uploader_id: user!.id,
        title: input.title,
        description: input.description ?? null,
        kind: input.kind,
        file_path,
        url: input.kind === "link" ? input.url ?? null : null,
        mime,
        size_bytes,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["materials", v.class_id] }),
  });
}

export function useDeleteMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: MaterialRow) => {
      if (m.file_path) await supabase.storage.from("materials").remove([m.file_path]);
      const { error } = await supabase.from("materials").delete().eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export async function getMaterialUrl(m: MaterialRow): Promise<string | null> {
  if (m.kind === "link") return m.url;
  if (!m.file_path) return null;
  const { data } = await supabase.storage.from("materials").createSignedUrl(m.file_path, 3600);
  return data?.signedUrl ?? null;
}

/* ============================ Discussions ============================ */
export type DiscussionMessage = {
  id: string;
  class_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author_name?: string | null;
  author_avatar?: string | null;
};

export function useDiscussion(class_id?: string) {
  const { user } = useSession();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["discussion", class_id],
    enabled: !!class_id,
    queryFn: async (): Promise<DiscussionMessage[]> => {
      const { data, error } = await supabase
        .from("discussion_messages")
        .select("*")
        .eq("class_id", class_id!)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      const rows = (data ?? []) as DiscussionMessage[];
      const ids = Array.from(new Set(rows.map((r) => r.author_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", ids);
        const map = new Map(profs?.map((p) => [p.id, p]) ?? []);
        return rows.map((r) => ({
          ...r,
          author_name: map.get(r.author_id)?.full_name ?? null,
          author_avatar: map.get(r.author_id)?.avatar_url ?? null,
        }));
      }
      return rows;
    },
  });

  useEffect(() => {
    if (!class_id) return;
    const channel = supabase
      .channel(`discussion:${class_id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "discussion_messages", filter: `class_id=eq.${class_id}` },
        () => qc.invalidateQueries({ queryKey: ["discussion", class_id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [class_id, qc]);

  const send = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase
        .from("discussion_messages")
        .insert({ class_id: class_id!, author_id: user!.id, body });
      if (error) throw error;
    },
  });

  return { ...query, send };
}

/* ============================ Study Plans ============================ */
export type StudyPlanRow = {
  id: string;
  user_id: string;
  title: string;
  goals: string | null;
  plan: {
    summary?: string;
    days?: { day: string; focus: string; tasks: string[] }[];
  };
  created_at: string;
};

export function useStudyPlans() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["study_plans", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<StudyPlanRow[]> => {
      const { data, error } = await supabase
        .from("study_plans")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StudyPlanRow[];
    },
  });
}

export function useDeleteStudyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("study_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study_plans"] }),
  });
}
