"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText, Loader2Icon, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { toPlainText, parseStoredOutput } from "@/lib/editorContent";

// Firestore's `in` operator accepts at most 30 values per query.
const IN_QUERY_LIMIT = 30;

// A short excerpt of the body text around the first match, for context.
function makeSnippet(content, needle) {
  if (!content) return "";
  const idx = content.toLowerCase().indexOf(needle);
  if (idx === -1) return "";
  const start = Math.max(0, idx - 30);
  const end = Math.min(content.length, idx + needle.length + 40);
  return `${start > 0 ? "…" : ""}${content.slice(start, end)}${
    end < content.length ? "…" : ""
  }`;
}

function chunk(items, size) {
  const groups = [];
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
  return groups;
}

/**
 * Searches documents by name across every workspace the user can reach.
 *
 * Firestore has no full-text search, and document content is an opaque JSON
 * blob in `documentOutput`, so matching body text would mean downloading every
 * document. Names only — add Algolia/Typesense if content search is needed.
 */
function SearchDocuments() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const { orgId } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  // Cmd/Ctrl+K to open.
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Load once per open, rather than querying on every keystroke.
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const owner = orgId || user?.primaryEmailAddress?.emailAddress;
        const workspaceSnapshot = await getDocs(
          query(collection(db, "Workspace"), where("orgId", "==", owner))
        );

        const workspaceNameById = {};
        workspaceSnapshot.forEach((snap) => {
          const data = snap.data();
          if (!data.deletedAt) workspaceNameById[snap.id] = data.workspaceName;
        });

        // Only search inside workspaces that aren't trashed.
        const workspaceIds = Object.keys(workspaceNameById).map(Number);
        const results = [];

        // `in` throws on an empty array, so guard.
        for (const group of chunk(workspaceIds, IN_QUERY_LIMIT)) {
          if (!group.length) continue;
          const documentSnapshot = await getDocs(
            query(
              collection(db, "workspaceDocuments"),
              where("workspaceId", "in", group)
            )
          );
          documentSnapshot.forEach((snap) => {
            const data = snap.data();
            if (data.deletedAt) return; // skip trashed documents
            results.push({
              id: snap.id,
              documentName: data.documentName,
              emoji: data.emoji,
              workspaceId: String(data.workspaceId),
              workspaceName: workspaceNameById[String(data.workspaceId)],
              content: "", // filled in below
            });
          });
        }

        // Pull each document's body text so search can match content, not just
        // titles. Firestore has no full-text index, so we fetch and search in
        // the browser — fine at this scale; swap to Algolia/Typesense if the
        // document count grows large.
        const docIds = results.map((r) => r.id);
        const contentById = {};
        for (const group of chunk(docIds, IN_QUERY_LIMIT)) {
          if (!group.length) continue;
          const outputSnapshot = await getDocs(
            query(collection(db, "documentOutput"), where("docId", "in", group))
          );
          outputSnapshot.forEach((snap) => {
            const data = snap.data();
            contentById[data.docId] = toPlainText(parseStoredOutput(data.output));
          });
        }
        results.forEach((r) => {
          r.content = contentById[r.id] ?? "";
        });

        if (!cancelled) setDocuments(results);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, orgId, user]);

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return documents.map((item) => ({ ...item, snippet: "" }));

    return documents
      .filter(
        (item) =>
          item.documentName?.toLowerCase().includes(needle) ||
          item.workspaceName?.toLowerCase().includes(needle) ||
          item.content?.toLowerCase().includes(needle)
      )
      .map((item) => ({ ...item, snippet: makeSnippet(item.content, needle) }));
  }, [documents, term]);

  const openDocument = (item) => {
    setOpen(false);
    setTerm("");
    router.push(`/workspace/${item.workspaceId}/${item.id}`);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="flex w-full justify-start gap-2 font-normal text-gray-500"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Search documents...</span>
        <kbd className="ml-auto hidden shrink-0 rounded border px-1.5 py-0.5 text-[10px] md:inline">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Search documents</DialogTitle>
          </DialogHeader>

          <Input
            autoFocus
            value={term}
            placeholder="Search titles and content..."
            onChange={(event) => setTerm(event.target.value)}
          />

          <div className="max-h-[320px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2Icon className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                {documents.length === 0
                  ? "No documents yet."
                  : `No documents match "${term}".`}
              </p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => openDocument(item)}
                  className="flex w-full items-start gap-3 rounded-md p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <span className="w-5 shrink-0 text-center pt-0.5">
                    {item.emoji ?? <FileText className="h-4 w-4 text-gray-400" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        {item.documentName || "Untitled Document"}
                      </span>
                      <span className="shrink-0 truncate text-xs text-gray-400">
                        {item.workspaceName}
                      </span>
                    </span>
                    {item.snippet && (
                      <span className="block truncate text-xs text-gray-400">
                        {item.snippet}
                      </span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SearchDocuments;
