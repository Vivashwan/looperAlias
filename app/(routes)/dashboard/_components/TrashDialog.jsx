"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Loader2Icon,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  restoreDocument,
  restoreWorkspace,
  deleteDocumentCascade,
  deleteWorkspaceCascade,
} from "@/lib/firestoreActions";

const IN_QUERY_LIMIT = 30;
function chunk(items, size) {
  const groups = [];
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
  return groups;
}

/**
 * The recycle bin: lists soft-deleted workspaces and documents so they can be
 * restored or permanently removed. `onChanged` lets the dashboard re-fetch when
 * a workspace is restored/purged (documents refresh on their own via onSnapshot,
 * but the dashboard's workspace list is a one-shot read).
 */
function TrashDialog({ onChanged }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [documents, setDocuments] = useState([]);
  const { orgId } = useAuth();
  const { user } = useUser();

  // Loaded on mount (to decide whether to show the button at all) and again
  // each time the dialog opens (to refresh).
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
        const owner = orgId || user?.primaryEmailAddress?.emailAddress;
        const wsSnap = await getDocs(
          query(collection(db, "Workspace"), where("orgId", "==", owner))
        );

        const all = wsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const trashedWorkspaces = all.filter((w) => w.deletedAt);
        const activeWorkspaces = all.filter((w) => !w.deletedAt);

        const nameById = {};
        activeWorkspaces.forEach((w) => {
          nameById[String(w.id)] = w.workspaceName;
        });

        // Only surface individually-deleted documents (those whose workspace is
        // still active). Documents inside a trashed workspace travel with it.
        const activeIds = activeWorkspaces.map((w) => Number(w.id));
        const trashedDocuments = [];
        for (const group of chunk(activeIds, IN_QUERY_LIMIT)) {
          if (!group.length) continue;
          const docSnap = await getDocs(
            query(
              collection(db, "workspaceDocuments"),
              where("workspaceId", "in", group)
            )
          );
          docSnap.forEach((d) => {
            const data = d.data();
            if (!data.deletedAt) return;
            trashedDocuments.push({
              id: d.id,
              documentName: data.documentName,
              emoji: data.emoji,
              workspaceId: String(data.workspaceId),
              workspaceName: nameById[String(data.workspaceId)],
            });
          });
        }

        setWorkspaces(trashedWorkspaces);
        setDocuments(trashedDocuments);
      } catch (error) {
        console.error("Failed to load trash:", error);
      } finally {
        setLoading(false);
      }
  }, [orgId, user]);

  // Check on mount/org change (to decide button visibility) and on each open.
  useEffect(() => {
    load();
  }, [load, open]);

  const restoreWs = async (id) => {
    try {
      await restoreWorkspace(id);
      setWorkspaces((list) => list.filter((w) => String(w.id) !== String(id)));
      toast.success("Workspace restored");
      onChanged?.();
    } catch (error) {
      console.error(error);
      toast.error("Couldn't restore workspace.");
    }
  };

  const restoreDoc = async (id) => {
    try {
      await restoreDocument(id);
      setDocuments((list) => list.filter((d) => d.id !== id));
      toast.success("Document restored");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't restore document.");
    }
  };

  const purgeWs = async (workspace) => {
    if (
      !window.confirm(
        `Permanently delete "${workspace.workspaceName}" and all its documents? This cannot be undone.`
      )
    )
      return;
    try {
      await deleteWorkspaceCascade(workspace.id);
      setWorkspaces((list) =>
        list.filter((w) => String(w.id) !== String(workspace.id))
      );
      toast.success("Workspace permanently deleted");
      onChanged?.();
    } catch (error) {
      console.error(error);
      toast.error("Couldn't delete workspace.");
    }
  };

  const purgeDoc = async (document) => {
    if (
      !window.confirm(
        `Permanently delete "${
          document.documentName || "Untitled Document"
        }"? This cannot be undone.`
      )
    )
      return;
    try {
      await deleteDocumentCascade(document.id);
      setDocuments((list) => list.filter((d) => d.id !== document.id));
      toast.success("Document permanently deleted");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't delete document.");
    }
  };

  const isEmpty = !loading && workspaces.length === 0 && documents.length === 0;

  // Hide the whole control when there's nothing to restore — no empty bin
  // button cluttering the toolbar. (Stays mounted while open so the dialog can
  // finish showing even if you just emptied it.)
  if (!open && isEmpty) return null;

  return (
    <>
      <Button
        variant="outline"
        className="flex gap-2 text-gray-500"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
        <span className="hidden sm:inline">Trash</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trash</DialogTitle>
            <DialogDescription>
              Restore items, or delete them permanently.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[380px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2Icon className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : isEmpty ? (
              <p className="py-10 text-center text-sm text-gray-500">
                Trash is empty.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {workspaces.length > 0 && (
                  <Section title="Workspaces">
                    {workspaces.map((w) => (
                      <TrashRow
                        key={w.id}
                        icon={<span>{w.emoji || "📁"}</span>}
                        title={w.workspaceName || "Untitled Workspace"}
                        subtitle="Workspace"
                        onRestore={() => restoreWs(w.id)}
                        onPurge={() => purgeWs(w)}
                      />
                    ))}
                  </Section>
                )}

                {documents.length > 0 && (
                  <Section title="Documents">
                    {documents.map((d) => (
                      <TrashRow
                        key={d.id}
                        icon={
                          d.emoji ? (
                            <span>{d.emoji}</span>
                          ) : (
                            <FileText className="h-4 w-4 text-gray-400" />
                          )
                        }
                        title={d.documentName || "Untitled Document"}
                        subtitle={d.workspaceName}
                        onRestore={() => restoreDoc(d.id)}
                        onPurge={() => purgeDoc(d)}
                      />
                    ))}
                  </Section>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
        {title}
      </h3>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function TrashRow({ icon, title, subtitle, onRestore, onPurge }) {
  return (
    <div className="flex items-center gap-3 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
      <span className="w-5 shrink-0 text-center">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate">{title}</div>
        {subtitle && (
          <div className="truncate text-xs text-gray-400">{subtitle}</div>
        )}
      </div>
      <button
        onClick={onRestore}
        title="Restore"
        className="p-1 text-gray-500 hover:text-primary"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <button
        onClick={onPurge}
        title="Delete forever"
        className="p-1 text-gray-500 hover:text-red-500"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default TrashDialog;
