import React, { useState } from "react";
import {
  MoreVertical,
  Trash2,
  Link2 as Link2Icon,
  PenBox,
  SmilePlus,
} from "lucide-react";
import CoverPicker from "@/app/_components/CoverPicker";
import CoverMedia from "@/app/_components/CoverMedia";
import EmojiPickerComponent from "@/app/_components/EmojiPickerComponent";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function WorkspaceOptions({ workspace, deleteWorkspace, updateWorkspace }) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [emoji, setEmoji] = useState();
  const [coverImage, setCoverImage] = useState("/cover.png");
  const [saving, setSaving] = useState(false);

  if (!workspace) return null;

  const openRename = (event) => {
    event.preventDefault();
    event.stopPropagation();
    // Seed the form from the workspace each time it opens, so cancelling
    // doesn't leave stale edits behind.
    setNewName(workspace.workspaceName ?? "");
    setEmoji(workspace.emoji ?? undefined);
    setCoverImage(workspace.coverImage ?? "/cover.png");
    setIsRenameOpen(true);
  };

  const handleRenameConfirmed = async (event) => {
    event.stopPropagation();
    setSaving(true);
    try {
      await updateWorkspace(workspace.id, {
        workspaceName: newName,
        emoji,
        coverImage,
      });
      setIsRenameOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleShareLinkClick = async (event) => {
    event.stopPropagation();
    const workspaceLink = `${window.location.origin}/workspace/${workspace.id}`;
    try {
      await navigator.clipboard.writeText(workspaceLink);
      toast("Link copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy text: ", error);
      toast.error("Failed to copy link!");
    }
  };

  const handleDeleteConfirmed = async (event) => {
    event.stopPropagation();
    try {
      await deleteWorkspace(workspace.id);
      setIsAlertOpen(false);
    } catch (error) {
      console.error("Error during delete:", error);
    }
  };

  return (
    // Stop clicks bubbling to the workspace card, which would navigate away.
    <div onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger onClick={(event) => event.stopPropagation()}>
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={openRename}>
            <PenBox className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShareLinkClick}>
            <Link2Icon className="mr-2 h-4 w-4" />
            Share Link
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsAlertOpen(true);
            }}
            className="flex gap-2 text-red-500"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename: edit name, emoji and cover — mirrors the Create Workspace form */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent onClick={(event) => event.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Rename workspace</DialogTitle>
          </DialogHeader>

          {/* Cover image */}
          <CoverPicker setNewCover={(cover) => setCoverImage(cover)}>
            <div className="relative group cursor-pointer">
              <h2
                className="hidden absolute p-4 w-full h-full
                  items-center group-hover:flex justify-center"
              >
                Change Cover
              </h2>
              <div className="group-hover:opacity-40 relative overflow-hidden rounded-lg">
                <CoverMedia
                  src={coverImage}
                  width={400}
                  height={200}
                  alt="Workspace cover"
                  className="w-full h-[150px] object-cover rounded-lg"
                />
              </div>
            </div>
          </CoverPicker>

          {/* Emoji + name */}
          <div className="flex gap-2 items-center">
            <EmojiPickerComponent setEmojiIcon={(value) => setEmoji(value)}>
              <Button variant="outline">
                {emoji ? emoji : <SmilePlus className="h-4 w-4" />}
              </Button>
            </EmojiPickerComponent>
            <Input
              value={newName}
              placeholder="Workspace Name"
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && newName.trim() && !saving) {
                  handleRenameConfirmed(event);
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newName.trim() || saving}
              onClick={handleRenameConfirmed}
            >
              {saving ? "Saving..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent onClick={(event) => event.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              workspace and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(event) => event.stopPropagation()}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirmed}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default WorkspaceOptions;
