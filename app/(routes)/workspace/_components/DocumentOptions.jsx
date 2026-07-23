import React, { useState } from "react";
import { MoreVertical, Trash2, Link2 as Link2Icon, PenBox } from "lucide-react";
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

function DocumentOptions({ doc, deleteDocument, renameDocument }) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const openRename = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setNewName(doc?.documentName ?? "");
    setIsRenameOpen(true);
  };

  const handleRenameConfirmed = async (event) => {
    event.stopPropagation();
    setSaving(true);
    try {
      await renameDocument(doc.id, newName);
      setIsRenameOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleShareLinkClick = async (event) => {
    event.stopPropagation();
    const documentLink = `${window.location.origin}/workspace/${doc.workspaceId}/${doc.id}`;
    try {
      await navigator.clipboard.writeText(documentLink);
      toast("Link copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy text: ", error);
      toast.error("Failed to copy link!");
    }
  };

  const handleDeleteConfirmed = (event) => {
    event.stopPropagation();
    deleteDocument(doc.id, event);
    setIsAlertOpen(false);
  };

  return (
    // Stop clicks bubbling to the document row, which would navigate away.
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

      {/* Rename */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent onClick={(event) => event.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Rename document</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={newName}
            placeholder="Document name"
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && newName.trim() && !saving) {
                handleRenameConfirmed(event);
              }
            }}
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newName.trim() || saving}
              onClick={handleRenameConfirmed}
            >
              {saving ? "Saving..." : "Rename"}
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
              document and remove its data from our servers.
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

export default DocumentOptions;
