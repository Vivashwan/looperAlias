"use client";
import { Button } from "@/components/ui/button";
import { useAuth, useUser } from "@clerk/nextjs";
import { AlignLeft, LayoutGrid } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import WorkspaceItemList from "./WorkspaceItemList";
import SearchDocuments from "./SearchDocuments";
import TrashDialog from "./TrashDialog";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";

function WorkspaceList() {
  const { user } = useUser();
  const { orgId } = useAuth();
  const [workspaceList, setWorkspaceList] = useState([]);
  const [view, setView] = useState("grid"); // "grid" (tile) | "list"
  const [sort, setSort] = useState("newest"); // newest | oldest | name
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    user && getWorkspaceList();
  }, [orgId, user]);

  const getWorkspaceList = async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "Workspace"),
        where(
          "orgId",
          "==",
          orgId ? orgId : user?.primaryEmailAddress?.emailAddress
        )
      );
      const querySnapshot = await getDocs(q);

      const newWorkspaceList = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Hide soft-deleted (trashed) workspaces. Filtered here rather than in
        // the query so pre-existing docs without the field still show.
        if (!data.deletedAt) newWorkspaceList.push({ id: doc.id, ...data });
      });
      setWorkspaceList(newWorkspaceList);
    } catch (error) {
      console.error("Failed to load workspaces:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="my-6 p-5 sm:my-10 sm:p-10 md:px-24 lg:px-36 xl:px-52">
      {/* Stacks on phones (greeting on its own line, then search + button),
          and sits on one row from `sm` up. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <h2 className="font-bold text-2xl truncate shrink-0">
          Hello, {user?.fullName}
        </h2>
        <div className="flex flex-1 items-center gap-3 sm:justify-center">
          <div className="w-full sm:max-w-sm">
            <SearchDocuments />
          </div>
          <Link href={"/createworkspace"} className="shrink-0">
            <Button>+</Button>
          </Link>
        </div>
      </div>

      <div className="mt-10 flex justify-between">
        <div>
          <h2 className="font-medium text-primary">Workspaces</h2>
        </div>
        <div className="flex items-center gap-3">
          <TrashDialog onChanged={getWorkspaceList} />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-sm bg-transparent border rounded-md px-2 py-1 cursor-pointer outline-none"
            aria-label="Sort workspaces"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name (A–Z)</option>
          </select>
          {/* One toggle: shows the current view's icon; click flips grid <-> list. */}
          <button
            onClick={() => setView(view === "grid" ? "list" : "grid")}
            title={view === "grid" ? "Switch to list view" : "Switch to grid view"}
            aria-label="Toggle view"
            className="text-primary cursor-pointer"
          >
            {view === "grid" ? <LayoutGrid /> : <AlignLeft />}
          </button>
        </div>
      </div>

      {isLoading ? (
        // Skeleton grid — avoids flashing the "create workspace" empty state
        // before the fetch resolves.
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border rounded-xl overflow-hidden">
              <div className="h-[150px] bg-gray-200 dark:bg-gray-800 animate-pulse" />
              <div className="p-4">
                <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : workspaceList.length === 0 ? (
        <div className="flex flex-col justify-center items-center my-10">
          <Image
            src={"/workspace.png"}
            width={200}
            height={200}
            alt="workspace"
          />
          <h2>Create new workspace</h2>
          <Link href={"/createworkspace"}>
            <Button className="my-3">+ New Workspace</Button>
          </Link>
        </div>
      ) : (
        <WorkspaceItemList
          workspaceList={workspaceList}
          setWorkspaceList={setWorkspaceList}
          view={view}
          sort={sort}
        />
      )}
    </div>
  );
}

export default WorkspaceList;
