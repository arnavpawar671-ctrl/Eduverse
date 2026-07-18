import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FolderOpen, Plus, Loader2, Link as LinkIcon, File as FileIcon, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useRole, useSession } from "@/hooks/useAuth";
import { useClasses } from "@/lib/data";
import { useMaterials, useAddMaterial, useDeleteMaterial, getMaterialUrl, type MaterialRow } from "@/lib/features";
import { PageHeader } from "@/components/dashboard-bits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/materials")({
  head: () => ({ meta: [{ title: "Materials — EduVerse" }] }),
  component: MaterialsPage,
});

function MaterialsPage() {
  const { data: classes, isLoading: clsLoading } = useClasses();
  const { user } = useSession();
  const { data: role } = useRole(user?.id);
  const [classId, setClassId] = useState<string>("");
  const activeId = classId || classes?.[0]?.id;
  const activeClass = classes?.find((c) => c.id === activeId);
  const isTeacher = activeClass?.teacher_id === user?.id;
  const { data: materials, isLoading } = useMaterials(activeId);
  const del = useDeleteMaterial();

  async function openMaterial(m: MaterialRow) {
    const url = await getMaterialUrl(m);
    if (!url) return toast.error("Couldn't open file");
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <PageHeader
        title="Study Materials"
        subtitle="Documents, links and resources shared in your classes."
        action={isTeacher && activeId ? <AddMaterialDialog classId={activeId} /> : undefined}
      />

      {clsLoading ? (
        <Skeleton className="mb-6 h-10 w-64" />
      ) : !classes?.length ? (
        <Card className="rounded-2xl border-dashed p-8 text-center">
          <p className="font-semibold">You have no classes yet</p>
          <p className="text-sm text-muted-foreground">Join or create a class to see materials.</p>
        </Card>
      ) : (
        <Tabs value={activeId ?? ""} onValueChange={setClassId} className="mb-6">
          <TabsList className="flex-wrap">
            {classes.map((c) => <TabsTrigger key={c.id} value={c.id}>{c.name}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      )}

      {activeId && (
        isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">{[0,1,2,3].map(i=><Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        ) : !materials?.length ? (
          <Card className="flex flex-col items-center gap-2 rounded-2xl border-dashed p-12 text-center">
            <FolderOpen className="h-8 w-8 text-primary" />
            <p className="font-semibold">No materials yet</p>
            <p className="text-sm text-muted-foreground">
              {isTeacher ? "Upload files or share links with your class." : "Nothing shared here yet."}
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {materials.map((m) => (
              <Card key={m.id} className="flex items-start gap-3 rounded-2xl p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-primary">
                  {m.kind === "file" ? <FileIcon className="h-5 w-5" /> : <LinkIcon className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{m.title}</p>
                  {m.description && <p className="line-clamp-2 text-xs text-muted-foreground">{m.description}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                    {m.size_bytes ? ` · ${(m.size_bytes/1024).toFixed(0)} KB` : ""}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openMaterial(m)} aria-label="Open">
                    {m.kind === "file" ? <Download className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                  </Button>
                  {isTeacher && (
                    <Button size="icon" variant="ghost" onClick={() => del.mutate(m)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function AddMaterialDialog({ classId }: { classId: string }) {
  const add = useAddMaterial();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"file"|"link">("file");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function submit() {
    if (!title.trim()) return toast.error("Title required");
    if (kind === "file" && !file) return toast.error("Choose a file");
    if (kind === "link" && !url.trim()) return toast.error("URL required");
    try {
      await add.mutateAsync({
        class_id: classId,
        title: title.trim(),
        description: description.trim(),
        kind,
        url: url.trim(),
        file: file ?? undefined,
      });
      toast.success("Material added");
      setTitle(""); setDescription(""); setUrl(""); setFile(null); setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero"><Plus className="h-4 w-4" /> Add material</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add material</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={kind} onValueChange={(v)=>setKind(v as "file"|"link")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="file">File upload</SelectItem>
                <SelectItem value="link">External link</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e)=>setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea rows={2} value={description} onChange={(e)=>setDescription(e.target.value)} />
          </div>
          {kind === "file" ? (
            <div className="space-y-2">
              <Label>File</Label>
              <Input type="file" onChange={(e)=>setFile(e.target.files?.[0] ?? null)} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>URL</Label>
              <Input type="url" placeholder="https://…" value={url} onChange={(e)=>setUrl(e.target.value)} />
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button variant="hero" onClick={submit} disabled={add.isPending}>
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
