"use client";
import React, { useState } from "react";
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
      <div className="fixed right-5 bottom-5 z-50 flex flex-col items-end gap-2">
        <Button onClick={() => setOpenComment(!openComment)}>
          {openComment ? <X /> : <MessageCircle />}
        </Button>
        {openComment && <CommentBox />}
      </div>
    </div>
  );
}

export default DocumentEditorSection;
