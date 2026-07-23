import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";
import DocumentOptions from "./DocumentOptions";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { toast } from "sonner";
import {
  softDeleteDocument,
  restoreDocument,
  getWorkspaceDocumentIds,
} from "@/lib/firestoreActions";

function DocumentList({ documentList, params }) {
  const router = useRouter();

  // `doc` here is Firestore's helper — the map callback below shadows it, so
  // this must stay outside that callback.
  const RenameDocument = async (docId, newName) => {
    const trimmed = newName?.trim();
    if (!docId || !trimmed) {
      toast.error("Document name cannot be empty!");
      return;
    }

    try {
      await updateDoc(doc(db, "workspaceDocuments", docId), {
        documentName: trimmed,
      });
      // The sidebar list is an onSnapshot subscription, so it updates itself.
      toast.success("Document renamed!");
    } catch (error) {
      console.error("Error renaming document:", error);
      toast.error("Failed to rename document!");
    }
  };

  const DeleteDocument = async (docId, event) => {
    event.stopPropagation();

    try {
      // Soft delete: recoverable via the Undo toast below. The sidebar list is
      // an onSnapshot subscription that filters out trashed docs, so the row
      // disappears on its own.
      await softDeleteDocument(docId);

      toast("Document moved to Trash", {
        action: {
          label: "Undo",
          onClick: () => restoreDocument(docId).catch(() => {}),
        },
      });

      // If the open document was the one deleted, move to a surviving one.
      if (docId === params?.documentid) {
        const remaining = documentList.filter((d) => d.id !== docId);
        const workspaceId = params?.workspaceid;
        if (remaining.length > 0) {
          router.replace(`/workspace/${workspaceId}/${remaining[0].id}`);
        } else {
          router.push(`/workspace/${workspaceId}`);
        }
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document!");
    }
  };

  return (
    <div>
      {documentList.map((doc, index) => (
        <div
          key={index}
          onClick={() =>
            router.push("/workspace/" + params?.workspaceid + "/" + doc?.id)
          }
          className={`mt-3 p-2 px-3 hover:bg-gray-200 dark:hover:bg-gray-800
            rounded-lg cursor-pointer flex justify-between items-center
            ${doc?.id == params?.documentid && "bg-white dark:bg-gray-800"}
            `}
        >
          <div className="flex gap-2 items-center">
            {!doc.emoji && (
              <Image src={"/loopdocument.svg"} width={20} height={20} />
            )}
            <h2 className="flex gap-2">
              {" "}
              {doc?.emoji} {doc.documentName}
            </h2>
          </div>
          <DocumentOptions
            doc={doc}
            deleteDocument={(docId, event) => DeleteDocument(docId, event)}
            renameDocument={RenameDocument}
          />
        </div>
      ))}
    </div>
  );
}

export default DocumentList;
