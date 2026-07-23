import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import uuid4 from "uuid4";
import { db } from "@/config/firebaseConfig";

// A document's content lives in `documentOutput`, keyed by the same id as the
// `workspaceDocuments` record. Deleting one without the other leaves orphans.
const WRITES_PER_DOCUMENT = 2;
// Firestore caps a batch at 500 writes.
const DOCUMENTS_PER_BATCH = Math.floor(500 / WRITES_PER_DOCUMENT);

/**
 * Creates an empty document in a workspace and returns its id.
 * Content lives in `documentOutput`; the `workspaceDocuments` record is metadata.
 */
export async function createDocument(workspaceId, createdBy) {
  const documentId = uuid4();

  await setDoc(doc(db, "workspaceDocuments", documentId), {
    workspaceId: Number(workspaceId),
    createdBy,
    coverImage: null,
    emoji: null,
    id: documentId,
    documentName: "Untitled Document",
  });

  await setDoc(doc(db, "documentOutput", documentId), {
    docId: documentId,
    output: [],
  });

  return documentId;
}

// ---------------------------------------------------------------------------
// Soft delete / restore
//
// Instead of destroying data immediately, we stamp a `deletedAt` timestamp.
// Listings filter these out CLIENT-SIDE (not with a Firestore `where`) because
// documents created before this feature have no `deletedAt` field, and
// Firestore's `where("deletedAt","==",null)` would exclude missing-field docs
// too. `isTrashed()` treats missing as "not trashed", so no migration needed.
// ---------------------------------------------------------------------------

export function isTrashed(record) {
  return Boolean(record?.deletedAt);
}

export async function softDeleteDocument(documentId) {
  await updateDoc(doc(db, "workspaceDocuments", documentId), {
    deletedAt: Date.now(),
  });
}

export async function restoreDocument(documentId) {
  await updateDoc(doc(db, "workspaceDocuments", documentId), {
    deletedAt: null,
  });
}

export async function softDeleteWorkspace(workspaceId) {
  await updateDoc(doc(db, "Workspace", String(workspaceId)), {
    deletedAt: Date.now(),
  });
}

export async function restoreWorkspace(workspaceId) {
  await updateDoc(doc(db, "Workspace", String(workspaceId)), {
    deletedAt: null,
  });
}

/** Permanently deletes a document and its stored editor content. */
export async function deleteDocumentCascade(documentId) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "workspaceDocuments", documentId));
  batch.delete(doc(db, "documentOutput", documentId));
  await batch.commit();
}

/** Returns the ids of every document belonging to a workspace. */
export async function getWorkspaceDocumentIds(workspaceId) {
  const snapshot = await getDocs(
    query(
      collection(db, "workspaceDocuments"),
      // workspaceId is stored as a number (Date.now()), but arrives as a string
      // from the route params.
      where("workspaceId", "==", Number(workspaceId))
    )
  );
  return snapshot.docs.map((snap) => snap.id);
}

/**
 * Deletes a workspace along with all of its documents and their content.
 * Without this, `workspaceDocuments` and `documentOutput` accumulate forever.
 */
export async function deleteWorkspaceCascade(workspaceId) {
  const documentIds = await getWorkspaceDocumentIds(workspaceId);

  for (let i = 0; i < documentIds.length; i += DOCUMENTS_PER_BATCH) {
    const batch = writeBatch(db);
    for (const documentId of documentIds.slice(i, i + DOCUMENTS_PER_BATCH)) {
      batch.delete(doc(db, "workspaceDocuments", documentId));
      batch.delete(doc(db, "documentOutput", documentId));
    }
    await batch.commit();
  }

  // Note the capital W: the collection is "Workspace", not "workspaces".
  await deleteDoc(doc(db, "Workspace", String(workspaceId)));
}
