"use client";

import CoverPicker from "@/app/_components/CoverPicker";
import { highResCover } from "@/app/_shared/CoverOption";
import EmojiPickerComponent from "@/app/_components/EmojiPickerComponent";
import { db } from "@/config/firebaseConfig";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { SmilePlus } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

function DocumentInfo({ params }) {
  const [coverImage, setCoverImage] = useState("/cover.png");
  const [emoji, setEmoji] = useState();
  const [documentInfo, setDocumentInfo] = useState();
  const router = useRouter();

  useEffect(() => {
    if (params) {
      const docRef = doc(db, "workspaceDocuments", params?.documentid);

      // Real-time listener for document changes
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDocumentInfo(data);
          setEmoji(data?.emoji);
          if (data?.coverImage) {
            setCoverImage(data.coverImage);
          }
        } else {
          // Document has been deleted
          toast.error("Document has been deleted!");
          router.push("/workspace/" + params?.workspaceid); // Redirect to workspace or dashboard
        }
      });

      return () => unsubscribe(); // Clean up the listener on unmount
    }
  }, [params, router]);

  const updateDocumentInfo = async (key, value) => {
    const docRef = doc(db, "workspaceDocuments", params?.documentid);
    try {
      await updateDoc(docRef, {
        [key]: value,
      });
      toast("Document Updated!");
    } catch (error) {
      console.error("Error updating document:", error);
      toast.error("Failed to update document!");
    }
  };

  return (
    <div>
      {/* Cover  */}
      <CoverPicker
        setNewCover={(cover) => {
          setCoverImage(cover);
          updateDocumentInfo("coverImage", cover);
        }}
      >
        <div className="relative group cursor-pointer">
          <h2
            className="hidden absolute p-4 w-full h-full
                    items-center group-hover:flex
                    justify-center"
          >
            Change Cover
          </h2>
          <div className="relative w-full h-[200px] group-hover:opacity-40">
            {/* `fill` + `sizes` lets Next serve a full-width source instead of
                upscaling a 400px one, which made the banner look blurry. */}
            <Image
              src={highResCover(coverImage)}
              alt="Document cover"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </div>
      </CoverPicker>

      {/* Emoji Picker  */}
      <div className="absolute ml-4 px-4 md:ml-10 md:px-20 mt-[-40px] cursor-pointer">
        <EmojiPickerComponent
          setEmojiIcon={(emoji) => {
            setEmoji(emoji);
            updateDocumentInfo("emoji", emoji);
          }}
        >
          <div className="bg-[#ffffffb0] p-4 rounded-md">
            {emoji ? (
              <span className="text-5xl">{emoji}</span>
            ) : (
              <SmilePlus className="h-10 w-10 text-gray-500" />
            )}
          </div>
        </EmojiPickerComponent>
      </div>

      {/* File Name  */}
      <div className="mt-10 p-4 px-4 md:px-20 md:ml-10 md:p-10">
        <input
          type="text"
          placeholder="Untitled Document"
          defaultValue={documentInfo?.documentName}
          className="w-full font-bold text-2xl md:text-4xl outline-none"
          onBlur={(event) =>
            updateDocumentInfo("documentName", event.target.value)
          }
        />
      </div>
    </div>
  );
}

export default DocumentInfo;
