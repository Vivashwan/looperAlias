import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useMemo } from "react";
import WorkspaceOptions from "./WorkspaceOptions";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { highResCover } from "@/app/_shared/CoverOption";
import { softDeleteWorkspace, restoreWorkspace } from "@/lib/firestoreActions";

function WorkspaceItemList({
  workspaceList,
  setWorkspaceList,
  view = "grid",
  sort = "newest",
}) {
  const router = useRouter();
  const isList = view === "list";

  // Favorites always float to the top; the chosen sort orders the rest.
  const sortedList = useMemo(() => {
    const bySort = {
      newest: (a, b) => Number(b.id) - Number(a.id),
      oldest: (a, b) => Number(a.id) - Number(b.id),
      name: (a, b) =>
        (a.workspaceName || "").localeCompare(b.workspaceName || ""),
    };
    return [...workspaceList].sort(
      (a, b) =>
        Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) ||
        (bySort[sort] || bySort.newest)(a, b)
    );
  }, [workspaceList, sort]);

  const toggleFavorite = async (workspaceId, current, event) => {
    event.stopPropagation();
    const next = !current;
    // Optimistic: flip locally first, revert if the write fails.
    setWorkspaceList((list) =>
      list.map((w) =>
        String(w.id) === String(workspaceId) ? { ...w, favorite: next } : w
      )
    );
    try {
      await updateDoc(doc(db, "Workspace", String(workspaceId)), {
        favorite: next,
      });
    } catch (error) {
      console.error("Failed to update favorite:", error);
      setWorkspaceList((list) =>
        list.map((w) =>
          String(w.id) === String(workspaceId) ? { ...w, favorite: current } : w
        )
      );
      toast.error("Couldn't update favorite.");
    }
  };

  const onClickWorkspaceItem = (workspaceId) => {
    router.push("/workspace/" + String(workspaceId));
  };

  const updateWorkspace = async (workspaceId, updates) => {
    const workspaceName = updates?.workspaceName?.trim();
    if (!workspaceId || !workspaceName) {
      toast.error("Workspace name cannot be empty!");
      return;
    }

    const payload = {
      workspaceName,
      emoji: updates.emoji ?? null,
      coverImage: updates.coverImage,
    };

    try {
      await updateDoc(doc(db, "Workspace", workspaceId), payload);
      // Patch in place so the card updates without a full page reload.
      setWorkspaceList((list) =>
        list.map((w) =>
          String(w.id) === String(workspaceId) ? { ...w, ...payload } : w
        )
      );
      toast.success("Workspace updated!");
    } catch (error) {
      console.error("Error updating workspace:", error);
      toast.error("Failed to update workspace.");
    }
  };

  const deleteWorkspace = async (workspaceId) => {
    if (!workspaceId) {
      toast.error("Invalid workspace ID!");
      return;
    }

    // Snapshot so Undo can put the exact card back where it was.
    const removed = workspaceList.find(
      (w) => String(w.id) === String(workspaceId)
    );

    try {
      // Soft delete: recoverable from Trash or the Undo toast below.
      await softDeleteWorkspace(workspaceId);
      setWorkspaceList((list) =>
        list.filter((w) => String(w.id) !== String(workspaceId))
      );

      toast("Workspace moved to Trash", {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await restoreWorkspace(workspaceId);
              if (removed) setWorkspaceList((list) => [...list, removed]);
            } catch (error) {
              console.error("Failed to restore workspace:", error);
              toast.error("Couldn't restore the workspace.");
            }
          },
        },
      });
    } catch (error) {
      console.error("Error deleting workspace:", error);
      toast.error("Failed to delete workspace.");
    }
  };

  return (
    <div
      className={
        isList
          ? "flex flex-col gap-3 mt-6"
          : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6"
      }
    >
      {sortedList.map((workspace) => (
        <div
          key={workspace.id}
          className={
            isList
              ? "border shadow-md rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer flex items-center gap-4 p-2"
              : "border shadow-xl rounded-xl hover:scale-105 transition-all cursor-pointer"
          }
          onClick={() => onClickWorkspaceItem(String(workspace.id))}
        >
          <Image
            src={highResCover(workspace?.coverImage)}
            width={400}
            height={200}
            alt="cover"
            sizes={isList ? "80px" : "(max-width: 768px) 50vw, 25vw"}
            className={
              isList
                ? "h-[50px] w-[80px] object-cover rounded-lg flex-shrink-0"
                : "h-[150px] object-cover rounded-t-xl"
            }
          />
          <div
            className={
              isList
                ? "flex-1 flex justify-between items-center pr-2"
                : "p-4 rounded-b-xl flex justify-between items-center"
            }
          >
            <h2 className="flex gap-2 truncate">
              {workspace?.emoji} {workspace.workspaceName}
            </h2>
            <div className="flex items-center shrink-0">
              <button
                aria-label={workspace.favorite ? "Unfavorite" : "Favorite"}
                onClick={(e) =>
                  toggleFavorite(workspace.id, workspace.favorite, e)
                }
                className="p-1"
              >
                <Star
                  className={`h-4 w-4 ${
                    workspace.favorite
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-400"
                  }`}
                />
              </button>
              <WorkspaceOptions
                workspace={{ ...workspace, id: String(workspace.id) }}
                deleteWorkspace={deleteWorkspace}
                updateWorkspace={updateWorkspace}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default WorkspaceItemList;
