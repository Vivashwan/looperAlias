"use client";
import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import DocumentHeader from "./DocumentHeader";
import DocumentInfo from "./DocumentInfo";
import { Button } from "@/components/ui/button";
import { MessageCircle, X } from "lucide-react";
import CommentBox from "./CommentBox";
import LiveCursors from "./LiveCursors";

// EditorJS tools reference browser globals (e.g. `Element`) at import time,
// which crashes during SSR. Load the editor on the client only.
const RichDocumentEditor = dynamic(() => import("./RichDocumentEditor"), {
  ssr: false,
});

function DocumentEditorSection({ params }) {
  const [openComment, setOpenComment] = useState(false);
  const commentRef = useRef(null);

  // Close the comment box when clicking outside of it, so the user doesn't have
  // to hit the X. Ignore clicks inside the box and inside Liveblocks' @-mention
  // / emoji popovers (they portal to <body>, so they're outside the box's DOM).
  useEffect(() => {
    if (!openComment) return;
    const onPointerDown = (event) => {
      const target = event.target;
      if (commentRef.current?.contains(target)) return;
      if (target?.closest?.(".lb-portal, .lb-root, .lb-elevation")) return;
      setOpenComment(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [openComment]);

  return (
    <div>
      <LiveCursors />
      <DocumentHeader />
      <DocumentInfo params={params} />
      {/* No grid here: the comment button below is `fixed`, so it takes up no
          space in flow. A grid column reserved for it would just be dead air
          and would needlessly shorten the editor's line length. */}
      <div className="min-w-0">
        <RichDocumentEditor params={params} />
      </div>

      {/* z-50 so the panel (and its popovers) clear the sidebar, which is z-40. */}
      <div
        ref={commentRef}
        className="doc-float-comment fixed right-5 bottom-5 z-50 flex flex-col items-end gap-2"
      >
        <Button onClick={() => setOpenComment(!openComment)}>
          {openComment ? <X /> : <MessageCircle />}
        </Button>
        {openComment && <CommentBox />}
      </div>
    </div>
  );
}

export default DocumentEditorSection;
