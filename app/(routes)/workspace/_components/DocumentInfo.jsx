"use client";

import CoverPicker from "@/app/_components/CoverPicker";
import CoverMedia from "@/app/_components/CoverMedia";
import EmojiPickerComponent from "@/app/_components/EmojiPickerComponent";
import { db } from "@/config/firebaseConfig";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { SmilePlus } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { toast } from "sonner";

function DocumentInfo({ params }) {
  // null = not loaded yet. Starting at the default "/cover.png" made a custom
  // cover flash the default image for an instant on every load.
  const [coverImage, setCoverImage] = useState(null);
  const [emoji, setEmoji] = useState();
  const [documentInfo, setDocumentInfo] = useState();
  const router = useRouter();
  const { orgId } = useAuth();
  const { user } = useUser();

  // App-level authorization (defense-in-depth): confirm this document's
  // workspace belongs to the user's active org (or personal account). This is
  // NOT real security on its own — Firestore rules are — but it stops honest
  // users from opening another org's document via a guessed/shared URL.
  useEffect(() => {
    if (!params?.documentid || !user) return;
    let cancelled = false;

    (async () => {
      try {
        const docSnap = await getDoc(
          doc(db, "workspaceDocuments", params.documentid)
        );
        if (!docSnap.exists()) return; // "not found" handled by the listener below

        const wsSnap = await getDoc(
          doc(db, "Workspace", String(docSnap.data().workspaceId))
        );
        const owner = wsSnap.exists() ? wsSnap.data().orgId : null;
        const me = orgId || user?.primaryEmailAddress?.emailAddress;

        // Only redirect on a definite mismatch; a missing/unreadable workspace
        // is left to the content listener, so transient errors don't bounce
        // legitimate users.
        if (!cancelled && owner && me && owner !== me) {
          toast.error("You don't have access to this document.");
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Access check failed:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params?.documentid, orgId, user, router]);

  useEffect(() => {
    if (params) {
      const docRef = doc(db, "workspaceDocuments", params?.documentid);

      // Real-time listener for document changes
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        const data = docSnap.data();
        // Guard against URLs that don't resolve to a real, live document —
        // fabricated/guessed ids, bookmarks to removed docs, old notification
        // links, etc.
        if (!docSnap.exists()) {
          toast.error("Document not found.");
          router.push("/dashboard");
          return;
        }
        if (data?.deletedAt) {
          toast.error("This document has been deleted.");
          router.push("/dashboard");
          return;
        }
        setDocumentInfo(data);
        setEmoji(data?.emoji);
        // Fall back to the default only once we know the doc has no cover.
        setCoverImage(data?.coverImage || "/cover.png");
      });

      return () => unsubscribe(); // Clean up the listener on unmount
    }
  }, [params, router]);

  const updateDocumentInfo = async (key, value) => {
    const docRef = doc(db, "workspaceDocuments", params?.documentid);
    try {
      await updateDoc(docRef, {
        [key]: value,
      });
      toast("Document Updated!");
    } catch (error) {
      console.error("Error updating document:", error);
      toast.error("Failed to update document!");
    }
  };

  return (
    <div>
      {/* Cover  */}
      <CoverPicker
        setNewCover={(cover) => {
          setCoverImage(cover);
          updateDocumentInfo("coverImage", cover);
        }}
      >
        <div className="relative group cursor-pointer">
          <h2
            className="hidden absolute p-4 w-full h-full
                    items-center group-hover:flex
                    justify-center"
          >
            Change Cover
          </h2>
          <div className="relative w-full h-[200px] group-hover:opacity-40 bg-gray-100 dark:bg-gray-800 overflow-hidden">
            {/* Render nothing until the cover is known (avoids flashing the
                default). CoverMedia picks <video>/<img>/<Image> by URL type. */}
            {coverImage && (
              <CoverMedia src={coverImage} alt="Document cover" fill priority />
            )}
          </div>
        </div>
      </CoverPicker>

      {/* Emoji Picker  */}
      <div className="absolute ml-4 px-4 md:ml-10 md:px-20 mt-[-40px] cursor-pointer">
        <EmojiPickerComponent
          setEmojiIcon={(emoji) => {
            setEmoji(emoji);
            updateDocumentInfo("emoji", emoji);
          }}
        >
          <div className="bg-[#ffffffb0] p-4 rounded-md">
            {emoji ? (
              <span className="text-5xl">{emoji}</span>
            ) : (
              <SmilePlus className="h-10 w-10 text-gray-500" />
            )}
          </div>
        </EmojiPickerComponent>
      </div>

      {/* File Name  */}
      <div className="mt-10 p-4 px-4 md:px-20 md:ml-10 md:p-10">
        <input
          type="text"
          placeholder="Untitled Document"
          defaultValue={documentInfo?.documentName}
          className="w-full font-bold text-2xl md:text-4xl outline-none"
          onBlur={(event) =>
            updateDocumentInfo("documentName", event.target.value)
          }
        />
      </div>
    </div>
  );
}

export default DocumentInfo;
