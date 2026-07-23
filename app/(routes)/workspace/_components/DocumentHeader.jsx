"use client";
import React from "react";
import Avatars from "./Avatars";
import { ThemeToggle } from "@/app/_components/ThemeToggle";
import {
  ThemedOrganizationSwitcher,
  ThemedUserButton,
} from "@/app/_components/ClerkThemed";

function DocumentHeader() {
  return (
    <div className="flex justify-between items-center gap-3 p-3 px-7 shadow-md">
      {/* Left: org switcher. The w-10 spacer keeps it clear of the mobile
          sidebar hamburger, which is fixed at the top-left. */}
      <div className="flex items-center">
        <div className="w-10 md:w-0" />
        <ThemedOrganizationSwitcher />
      </div>
      {/* Right: theme toggle, collaborator avatars, then the account button. */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Avatars />
        <ThemedUserButton />
      </div>
    </div>
  );
}

export default DocumentHeader;
