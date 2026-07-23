import { auth, currentUser } from "@clerk/nextjs/server";
import { Liveblocks } from "@liveblocks/node";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCK_SK,
});

// Pages without a document open still need a room (for the notification bell).
// Scope it per-workspace rather than sharing one global room.
export const WORKSPACE_ROOM_PREFIX = "workspace-";

/** Every room maps to exactly one workspace, which is what we authorize against. */
async function resolveWorkspaceId(roomId) {
  if (roomId.startsWith(WORKSPACE_ROOM_PREFIX)) {
    return roomId.slice(WORKSPACE_ROOM_PREFIX.length);
  }
  // Otherwise the room id is a document id.
  const snapshot = await getDoc(doc(db, "workspaceDocuments", roomId));
  return snapshot.exists() ? String(snapshot.data().workspaceId) : null;
}

export async function POST(request) {
  const { orgId } = auth();
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  if (!email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const roomId = new URL(request.url).searchParams.get("roomId");
  if (!roomId || roomId === "undefined") {
    return new Response("Missing roomId", { status: 400 });
  }

  // Previously this granted FULL_ACCESS to whatever roomId the client asked
  // for, so any signed-in user could read/write any document. Verify the room
  // belongs to a workspace this user can actually reach.
  const workspaceId = await resolveWorkspaceId(roomId);
  if (!workspaceId) {
    return new Response("Room not found", { status: 404 });
  }

  const workspaceSnapshot = await getDoc(doc(db, "Workspace", workspaceId));
  if (!workspaceSnapshot.exists()) {
    return new Response("Room not found", { status: 404 });
  }

  // A workspace is owned by a Clerk org, or by the creator's email for
  // personal accounts (see createworkspace: orgId ?? primary email).
  const owner = workspaceSnapshot.data().orgId;
  if (owner !== (orgId || email)) {
    return new Response("Forbidden", { status: 403 });
  }

  // userInfo rides along in the token, so presence (avatars/cursors) can read
  // it via `useOthers()` without another lookup.
  const session = liveblocks.prepareSession(email, {
    userInfo: {
      name: user.fullName ?? email,
      avatar: user.imageUrl,
    },
  });

  session.allow(roomId, session.FULL_ACCESS);

  const { status, body } = await session.authorize();
  return new Response(body, { status });
}
