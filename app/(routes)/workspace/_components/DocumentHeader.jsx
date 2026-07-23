"use client";
import React from "react";
import Avatars from "./Avatars";
import { ThemeToggle } from "@/app/_components/ThemeToggle";
import {
  ThemedOrganizationSwitcher,
  ThemedUserButton,
} from "@/app/_components/ClerkThemed";

function DocumentHeader() {
  // Three equal columns so the org switcher sits centered. The left column
  // holds a spacer that clears the mobile sidebar hamburger (fixed top-left).
  return (
    <div className="flex items-center gap-3 p-3 px-7 shadow-md">
      <div className="flex-1 flex items-center">
        <div className="w-10 md:w-0" />
      </div>
      <div className="flex-1 flex justify-center">
        <ThemedOrganizationSwitcher />
      </div>
      <div className="flex-1 flex justify-end items-center gap-3">
        <ThemeToggle />
        <Avatars />
        <ThemedUserButton />
      </div>
    </div>
  );
}

export default DocumentHeader;
