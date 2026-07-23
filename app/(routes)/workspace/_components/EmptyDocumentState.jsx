"use client";
import { Button } from "@/components/ui/button";
import { db } from "@/config/firebaseConfig";
import { createDocument } from "@/lib/firestoreActions";
import { useUser } from "@clerk/nextjs";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Loader2Icon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Shown when a workspace has no documents. When it does have documents SideNav
 * redirects to the first one, so this renders nothing and never flashes.
 */
function EmptyDocumentState({ params }) {
  const [documentCount, setDocumentCount] = useState(null); // null = still loading
  const [creating, setCreating] = useState(false);
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!params?.workspaceid) return;
    const unsubscribe = onSnapshot(
      query(
        collection(db, "workspaceDocuments"),
        where("workspaceId", "==", Number(params.workspaceid))
      ),
      (snapshot) =>
        // Count only non-trashed docs, so a workspace whose documents are all
        // soft-deleted still shows the empty state.
        setDocumentCount(
          snapshot.docs.filter((d) => !d.data().deletedAt).length
        )
    );
    return () => unsubscribe();
  }, [params?.workspaceid]);

  // Loading, or SideNav is already navigating to the first document.
  if (documentCount === null || documentCount > 0) return null;

  const onCreateDocument = async () => {
    setCreating(true);
    try {
      const documentId = await createDocument(
        params.workspaceid,
        user?.primaryEmailAddress?.emailAddress
      );
      router.replace(`/workspace/${params.workspaceid}/${documentId}`);
    } catch (error) {
      console.error("Failed to create document:", error);
      toast.error("Failed to create document.");
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen px-6 text-center">
      <Image
        src="/workspace.png"
        width={160}
        height={160}
        alt="No documents yet"
      />
      <h2 className="mt-6 text-xl font-medium">This workspace is empty</h2>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        Create your first document to start writing and collaborating with your
        team.
      </p>
      <Button className="mt-6" onClick={onCreateDocument} disabled={creating}>
        {creating ? (
          <Loader2Icon className="h-4 w-4 animate-spin" />
        ) : (
          "+ New Document"
        )}
      </Button>
    </div>
  );
}

export default EmptyDocumentState;
