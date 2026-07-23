"use client";
import { useThreads } from "@liveblocks/react";
import React from "react";
import { Composer, Thread } from "@liveblocks/react-ui";

function CommentBox() {
  const { threads } = useThreads();

  return (
    // `bg-white` matters: without it the panel is transparent and the page
    // shows through, which reads as a "ghosted"/disabled composer.
    //
    // Scrolling lives on the thread list, NOT this container. An `overflow`
    // on the wrapper clips the Composer's @-mention and emoji popovers, which
    // makes them look like they never open.
    <div
      className="flex w-[320px] max-h-[420px] flex-col overflow-visible
        rounded-lg border bg-white dark:bg-gray-900 shadow-lg"
    >
      {threads?.length > 0 && (
        <div className="max-h-[260px] overflow-y-auto">
          {threads.map((thread) => (
            <Thread key={thread.id} thread={thread} />
          ))}
        </div>
      )}

      {/* The high-level <Composer> is a complete widget with its own submit
          button. It has no `.Submit` subcomponent (that's the primitives
          package) — using one rendered `undefined` and crashed the panel. */}
      <Composer />
    </div>
  );
}

export default CommentBox;
