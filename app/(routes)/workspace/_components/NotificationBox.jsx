import React, { useEffect, useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useInboxNotifications,
  useUnreadInboxNotificationsCount,
  useUpdateRoomNotificationSettings,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import {
  Composer,
  InboxNotification,
  InboxNotificationList,
} from "@liveblocks/react-ui";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const IN_QUERY_LIMIT = 30;

function NotificationBox({ children, params }) {
  const { inboxNotifications } = useInboxNotifications();
  const updateRoomNotificationSettings = useUpdateRoomNotificationSettings();
  const { count } = useUnreadInboxNotificationsCount();

  const [replyingTo, setReplyingTo] = useState(null);
  // roomId (= documentId) → "/workspace/<workspaceId>/<documentId>"
  const [hrefByRoom, setHrefByRoom] = useState({});

  const currentRoomId = params?.documentid;

  useEffect(() => {
    updateRoomNotificationSettings({ threads: "all" });
  }, [updateRoomNotificationSettings]);

  // Stable key so we only refetch when the SET of rooms changes.
  const roomKey = useMemo(
    () =>
      [...new Set(inboxNotifications.map((n) => n.roomId).filter(Boolean))]
        .sort()
        .join(","),
    [inboxNotifications]
  );

  // Resolve each notification's document to a link so the card is clickable.
  useEffect(() => {
    if (!roomKey) return;
    const roomIds = roomKey.split(",");
    let cancelled = false;

    (async () => {
      const map = {};
      for (let i = 0; i < roomIds.length; i += IN_QUERY_LIMIT) {
        const group = roomIds.slice(i, i + IN_QUERY_LIMIT);
        const snap = await getDocs(
          query(collection(db, "workspaceDocuments"), where("id", "in", group))
        );
        snap.forEach((d) => {
          const data = d.data();
          map[data.id] = `/workspace/${data.workspaceId}/${data.id}`;
        });
      }
      if (!cancelled) setHrefByRoom(map);
    })();

    return () => {
      cancelled = true;
    };
  }, [roomKey]);

  const closeReply = () => setReplyingTo(null);

  return (
    <Popover>
      <PopoverTrigger>
        <div className="flex gap-1">
          {children}{" "}
          <span className="p-1 px-2 -ml-3 rounded-full text-[7px] bg-primary text-white">
            {count}
          </span>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] max-h-[70vh] overflow-y-auto p-0">
        {inboxNotifications.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            No notifications yet.
          </p>
        ) : (
          <InboxNotificationList>
            {inboxNotifications.map((notification) => (
              <div key={notification.id} className="border-b last:border-b-0">
                {/* Whole card links to the document (it renders as an <a>). */}
                <InboxNotification
                  inboxNotification={notification}
                  href={hrefByRoom[notification.roomId]}
                />

                {notification.kind === "thread" &&
                  (replyingTo === notification.id ? (
                    <div className="px-3 pb-3">
                      {/* Header with a close (X) button to cancel replying. */}
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-500">
                          Reply
                        </span>
                        <button
                          onClick={closeReply}
                          aria-label="Cancel reply"
                          className="rounded p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {notification.roomId === currentRoomId ? (
                        // Already in this room — reply directly; it shows live
                        // in the open comment box.
                        <Composer
                          threadId={notification.threadId}
                          autoFocus
                          onComposerSubmit={closeReply}
                        />
                      ) : (
                        // Different document — mount its room just for the reply.
                        <RoomProvider
                          id={notification.roomId}
                          initialPresence={{ cursor: null }}
                        >
                          <ClientSideSuspense
                            fallback={
                              <div className="text-xs text-gray-400 py-2">
                                Loading…
                              </div>
                            }
                          >
                            <Composer
                              threadId={notification.threadId}
                              autoFocus
                              onComposerSubmit={closeReply}
                            />
                          </ClientSideSuspense>
                        </RoomProvider>
                      )}
                    </div>
                  ) : (
                    <div className="px-3 pb-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReplyingTo(notification.id)}
                      >
                        Reply
                      </Button>
                    </div>
                  ))}
              </div>
            ))}
          </InboxNotificationList>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBox;
