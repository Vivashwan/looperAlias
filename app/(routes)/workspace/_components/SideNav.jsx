"use client";
import Logo from "@/app/_components/Logo";
import { Button } from "@/components/ui/button";
import { db } from "@/config/firebaseConfig";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { Bell, Loader2Icon, Menu } from "lucide-react";
import React, { useEffect, useState } from "react";
import DocumentList from "./DocumentList";
import { toast } from "sonner";
import { createDocument } from "@/lib/firestoreActions";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import NotificationBox from "./NotificationBox";
import { ClientSideSuspense } from "@liveblocks/react/suspense";

function SideNav({ params }) {
  const [documentList, setDocumentList] = useState([]);
  const [workspace, setWorkspace] = useState();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Close the mobile drawer once a document is opened.
  useEffect(() => {
    setMobileOpen(false);
  }, [params?.documentid]);

  useEffect(() => {
    if (!params?.workspaceid) return;
    const unsubscribe = GetDocumentList();
    // Clean up the Firestore listener when the workspace changes or the
    // component unmounts, so listeners don't accumulate on every navigation.
    return () => unsubscribe && unsubscribe();
  }, [params?.workspaceid]);

  // Keep the workspace name/emoji in sync so the sidebar shows the real name
  // instead of a placeholder (and picks up renames live).
  useEffect(() => {
    if (!params?.workspaceid) return;
    const unsubscribe = onSnapshot(
      doc(db, "Workspace", String(params.workspaceid)),
      (snap) => setWorkspace(snap.exists() ? snap.data() : undefined)
    );
    return () => unsubscribe();
  }, [params?.workspaceid]);

  const GetDocumentList = () => {
    const q = query(
      collection(db, "workspaceDocuments"),
      where("workspaceId", "==", Number(params?.workspaceid))
    );
    return onSnapshot(q, (querySnapshot) => {
      // Build the list in one pass and set state once (avoids N re-renders).
      // Filter out soft-deleted (trashed) documents client-side.
      const docs = querySnapshot.docs
        .map((doc) => doc.data())
        .filter((doc) => !doc.deletedAt);
      setDocumentList(docs);

      // When a workspace is opened with no document selected, auto-open the
      // first document so the user doesn't land on an empty screen.
      if (!params?.documentid && docs.length > 0) {
        router.replace(
          "/workspace/" + params?.workspaceid + "/" + docs[0].id
        );
      }
    });
  };

  const CreateNewDocument = async () => {
    setLoading(true);
    try {
      const docId = await createDocument(
        params?.workspaceid,
        user?.primaryEmailAddress?.emailAddress
      );
      router.replace("/workspace/" + params?.workspaceid + "/" + docId);
    } catch (error) {
      console.error("Failed to create document:", error);
      toast.error("Failed to create document.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Mobile: open the sidebar. Hidden once the sidebar is always visible. */}
      <button
        aria-label="Open sidebar"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-30 rounded-md bg-white dark:bg-gray-800 p-2 shadow"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile: tap-away backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`h-screen w-72 fixed z-40 bg-blue-50 dark:bg-gray-900 p-5 shadow-md
          transition-transform duration-200 md:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex justify-between items-center">
          <Logo />
          <ClientSideSuspense
            fallback={<Bell className="h-5 w-5 text-gray-500" />}
          >
            <NotificationBox>
              <Bell className="h-5 w-5 text-gray-500" />
            </NotificationBox>
          </ClientSideSuspense>
        </div>
        <hr className="my-5"></hr>
        <div>
          <div className="flex justify-between items-center">
            <h2 className="font-medium flex gap-2 items-center truncate">
              {workspace?.emoji}
              <span className="truncate">{workspace?.workspaceName}</span>
            </h2>
            <Button size="sm" className="text-lg" onClick={CreateNewDocument}>
              {loading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : "+"}
            </Button>
          </div>
        </div>

        <DocumentList documentList={documentList} params={params} />
      </div>
    </>
  );
}

export default SideNav;