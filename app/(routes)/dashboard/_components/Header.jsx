"use client";
import Logo from "@/app/_components/Logo";
import { db } from "@/config/firebaseConfig";
import {
  OrganizationSwitcher,
  useAuth,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { doc, setDoc } from "firebase/firestore";
import React, { useEffect } from "react";
import { ThemeToggle } from "@/app/_components/ThemeToggle";

function Header() {
  const { orgId } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    user && saveUserData();
  }, [user]);

  const saveUserData = async () => {
    const docId = user?.primaryEmailAddress?.emailAddress;

    try {
      await setDoc(doc(db, "LooperAliasUsers", docId), {
        name: user?.fullName,
        avatar: user?.imageUrl,
        email: user?.primaryEmailAddress?.emailAddress,
      });
    } catch (e) {}
  };
  return (
    // Three equal columns so the org switcher sits truly centered, with the
    // theme toggle + user button on the right.
    <div className="flex items-center p-3 shadow-sm">
      <div className="flex-1 flex justify-start">
        <Logo />
      </div>
      <div className="flex-1 flex justify-center">
        <OrganizationSwitcher
          afterCreateOrganizationUrl={"/dashboard"}
          afterLeaveOrganizationUrl={"/dashboard"}
        />
      </div>
      <div className="flex-1 flex justify-end items-center gap-2">
        <ThemeToggle />
        <UserButton />
      </div>
    </div>
  );
}

export default Header;
