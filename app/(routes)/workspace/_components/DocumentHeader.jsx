import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import React from "react";
import Avatars from "./Avatars";
import { ThemeToggle } from "@/app/_components/ThemeToggle";

function DocumentHeader() {
  return (
    <div className="flex justify-between items-center gap-3 p-3 px-7 shadow-md">
      {/* Leaves room for the mobile sidebar toggle, which is fixed top-left. */}
      <div className="w-10 md:w-0" />
      <OrganizationSwitcher />
      <div className="flex items-center gap-3">
        <Avatars />
        <ThemeToggle />
        <UserButton />
      </div>
    </div>
  );
}

export default DocumentHeader;
