import React, { useEffect, useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useInboxNotifications,
  useUpdateRoomNotificationSettings,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import {
  Composer,
  InboxNotification,
  InboxNotificationList,
} from "@liveblocks/react-ui";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { useAuth, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Loader2Icon, X } from "lucide-react";

const IN_QUERY_LIMIT = 30;

function NotificationBox({ children, params }) {
  const { inboxNotifications } = useInboxNotifications();
  const updateRoomNotificationSettings = useUpdateRoomNotificationSettings();
  const { orgId } = useAuth();
  const { user } = useUser();

  // The current owner scope: active Clerk org, else personal email.
  const me = orgId || user?.primaryEmailAddress?.emailAddress;

  const [replyingTo, setReplyingTo] = useState(null);
  // roomId (= documentId) → "/workspace/<workspaceId>/<documentId>".
  // Only contains documents that still exist and aren't trashed.
  const [hrefByRoom, setHrefByRoom] = useState({});
  const [roomsResolved, setRoomsResolved] = useState(false);

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
    if (!roomKey || !me) {
      if (!roomKey) setRoomsResolved(true);
      return;
    }
    const roomIds = roomKey.split(",");
    let cancelled = false;
    setRoomsResolved(false);

    (async () => {
      try {
        // 1. Load the notification documents (skip trashed ones).
        const docs = [];
        for (let i = 0; i < roomIds.length; i += IN_QUERY_LIMIT) {
          const group = roomIds.slice(i, i + IN_QUERY_LIMIT);
          const snap = await getDocs(
            query(collection(db, "workspaceDocuments"), where("id", "in", group))
          );
          snap.forEach((d) => {
            const data = d.data();
            if (!data.deletedAt) {
              docs.push({ id: data.id, workspaceId: String(data.workspaceId) });
            }
          });
        }

        // 2. Look up each document's workspace (small set) for ownership.
        const workspaceIds = [...new Set(docs.map((d) => d.workspaceId))];
        const workspaceById = {};
        await Promise.all(
          workspaceIds.map(async (wid) => {
            const wsnap = await getDoc(doc(db, "Workspace", wid));
            if (wsnap.exists()) workspaceById[wid] = wsnap.data();
          })
        );

        // 3. Keep only documents the user can actually open: workspace exists,
        // isn't trashed, and belongs to the active org / personal account. This
        // is what stops notifications for other orgs' (or deleted) docs from
        // showing and then bouncing you on click.
        const map = {};
        docs.forEach((d) => {
          const ws = workspaceById[d.workspaceId];
          if (ws && !ws.deletedAt && ws.orgId === me) {
            map[d.id] = `/workspace/${d.workspaceId}/${d.id}`;
          }
        });

        if (!cancelled) {
          setHrefByRoom(map);
          setRoomsResolved(true);
        }
      } catch (error) {
        console.error("Failed to resolve notification documents:", error);
        if (!cancelled) {
          setHrefByRoom({});
          setRoomsResolved(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomKey, me]);

  // Show only notifications whose document the user can actually access.
  // `hrefByRoom` holds exactly those, so it doubles as the visibility filter.
  const visibleNotifications = inboxNotifications.filter(
    (n) => hrefByRoom[n.roomId]
  );

  // Badge counts only visible + unread, so it matches the list (Liveblocks'
  // own count would include hidden/other-org notifications).
  const visibleUnreadCount = visibleNotifications.filter(
    (n) => !n.readAt
  ).length;

  const closeReply = () => setReplyingTo(null);

  return (
    <Popover>
      <PopoverTrigger>
        <div className="flex gap-1">
          {children}{" "}
          {visibleUnreadCount > 0 && (
            <span className="p-1 px-2 -ml-3 rounded-full text-[7px] bg-primary text-white">
              {visibleUnreadCount}
            </span>
          )}
        </div>
      </PopoverTrigger>
      {/* Match the Liveblocks card background (#111827 = gray-900) so there are
          no darker gaps/seams showing between cards in dark mode. */}
      <PopoverContent className="w-[420px] max-h-[70vh] overflow-y-auto p-0 dark:bg-gray-900 dark:border-gray-800">
        {!roomsResolved ? (
          <div className="flex justify-center py-8">
            <Loader2Icon className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : visibleNotifications.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            No notifications yet.
          </p>
        ) : (
          <InboxNotificationList>
            {visibleNotifications.map((notification) => (
              <div
                key={notification.id}
                className="border-b border-black/5 dark:border-white/10 last:border-b-0"
              >
                {/* Whole card links to the document (it renders as an <a>). */}
                <InboxNotification
                  inboxNotification={notification}
                  href={hrefByRoom[notification.roomId]}
                />

                {notification.kind === "thread" &&
                  (replyingTo === notification.id ? (
                    // Inline (same background as the popover) so it blends in
                    // instead of exposing darker gaps around a distinct panel.
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
