"use client";
import React from "react";
import Avatars from "./Avatars";
import { ThemeToggle } from "@/app/_components/ThemeToggle";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

function DocumentHeader() {
  // Three equal columns so the org switcher sits centered. The left column
  // holds a spacer that clears the mobile sidebar hamburger (fixed top-left).
  return (
    <div className="flex items-center gap-2 p-3 px-3 md:gap-3 md:px-7 shadow-md">
      <div className="flex-1 flex items-center min-w-0">
        {/* Spacer clears the mobile sidebar hamburger (fixed top-left). */}
        <div className="w-10 md:w-0" />
      </div>
      <div className="flex-1 flex justify-center min-w-0">
        <OrganizationSwitcher />
      </div>
      <div className="flex-1 flex justify-end items-center gap-2 md:gap-3 min-w-0">
        <ThemeToggle />
        <Avatars />
        <UserButton />
      </div>
    </div>
  );
}

export default DocumentHeader;
