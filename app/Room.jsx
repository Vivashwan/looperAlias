"use client";

import { useRef } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { useOrganization } from "@clerk/nextjs";

export function Room({ children, params }) {
  // Members of the currently active organization. Used to scope @mention
  // suggestions to people invited to this org (instead of every app user).
  const { organization, memberships } = useOrganization({
    memberships: { pageSize: 100, keepPreviousData: true },
  });

  // LiveblocksProvider captures its resolver props ONCE, when it creates the
  // client. Clerk hasn't loaded on that first render, so a resolver that closed
  // over `organization`/`memberships` directly would capture `undefined` and
  // keep returning no suggestions forever. Read through a ref instead, so the
  // resolver always sees current values when it actually runs.
  const orgRef = useRef({ organization, memberships });
  orgRef.current = { organization, memberships };

  // One room per document. With no document open we still need a room for the
  // notification bell, so fall back to a workspace-scoped room. The auth
  // endpoint and RoomProvider must agree, or the token authorizes a room the
  // client never joins.
  const roomId = params?.documentid
    ? params.documentid
    : `workspace-${params?.workspaceid}`;

  return (
    <LiveblocksProvider
      authEndpoint={`/api/liveblocks-auth?roomId=${roomId}`}
      resolveUsers={async ({ userIds }) => {
        // Firestore's `in` throws on an empty array and caps at 30 values.
        if (!userIds?.length) return [];

        const q = query(
          collection(db, "LooperAliasUsers"),
          where("email", "in", userIds.slice(0, 30))
        );
        const querySnapshot = await getDocs(q);

        const byEmail = {};
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          byEmail[data.email] = data;
        });

        // Liveblocks expects one entry per requested id, in the same order —
        // returning Firestore's arbitrary order mislabels mention chips.
        return userIds.map((email) => byEmail[email] ?? { name: email });
      }}
      resolveMentionSuggestions={async ({ text }) => {
        // Read current values (see orgRef above) — never the render-time closure.
        const { organization: org, memberships: loaded } = orgRef.current;

        // Personal account (no active org): nobody to scope mentions to.
        if (!org) return [];

        let rows = loaded?.data ?? [];

        // The paginated hook may not have resolved yet when the user types "@".
        // Fetch directly in that case rather than returning an empty list.
        if (rows.length === 0) {
          try {
            const fetched = await org.getMemberships({ pageSize: 100 });
            rows = fetched?.data ?? fetched ?? [];
          } catch (error) {
            console.error("Could not load organization members:", error);
            return [];
          }
        }

        let members = rows.map((membership) => ({
          email: membership.publicUserData?.identifier,
          name: [
            membership.publicUserData?.firstName,
            membership.publicUserData?.lastName,
          ]
            .filter(Boolean)
            .join(" "),
        }));

        if (text) {
          const search = text.toLowerCase();
          members = members.filter(
            (user) =>
              user.email?.toLowerCase().includes(search) ||
              user.name?.toLowerCase().includes(search)
          );
        }

        // Liveblocks mention IDs are emails (see resolveUsers above).
        return members.map((user) => user.email).filter(Boolean);
      }}
      resolveRoomsInfo={async ({ roomIds }) => {
        // Room IDs are document IDs. Resolve them to the document name so
        // notifications read "commented in <Document Name>" instead of a UUID.
        if (!roomIds?.length) return [];

        const q = query(
          collection(db, "workspaceDocuments"),
          where("id", "in", roomIds.slice(0, 30))
        );
        const querySnapshot = await getDocs(q);
        const byId = {};
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          byId[data.id] = data;
        });

        // Return one entry per requested roomId, in the same order.
        return roomIds.map((id) => ({
          name: byId[id]?.documentName || "Untitled Document",
        }));
      }}
    >
      <RoomProvider id={roomId} initialPresence={{ cursor: null }}>
        {/*
          This subtree (EditorJS, Firestore, emoji pickers) is client-only and
          not SSR-safe, so we defer it to the client. It does NOT block on
          Liveblocks: the only component that waits for the room (the
          notification bell) has its own <ClientSideSuspense> in SideNav, so
          the document list renders as soon as the client mounts.
        */}
        <ClientSideSuspense fallback={null}>{children}</ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
