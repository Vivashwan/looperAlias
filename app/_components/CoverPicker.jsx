import React, { useState } from 'react'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import CoverOption, { coverType } from '../_shared/CoverOption'
import CoverMedia from './CoverMedia'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function CoverPicker({ children, setNewCover }) {
    const [selectedCover, setSelectedCover] = useState();
    // A cover the user pastes in themselves (any image / GIF / video URL).
    const [customUrl, setCustomUrl] = useState("");

    const trimmedCustom = customUrl.trim();
    const isSelected = (url) => selectedCover === url;

    return (
        <Dialog>
            <DialogTrigger className='w-full'>
                {children}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update Cover</DialogTitle>
                    {/* DialogDescription renders a <p>, so the grid/inputs live
                        as siblings — nesting block elements in a <p> is invalid
                        HTML and triggers a hydration warning. */}
                    <DialogDescription>
                        Pick an image, GIF or video cover — or paste your own URL.
                    </DialogDescription>
                </DialogHeader>

                <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mt-3 max-h-[320px] overflow-y-auto'>
                    {CoverOption.map((cover) => (
                        <div key={cover.imageUrl}
                            onClick={() => setSelectedCover(cover?.imageUrl)}
                            className={`${isSelected(cover?.imageUrl) && 'border-primary border-2'} p-1 rounded-md cursor-pointer`}
                        >
                            <CoverMedia
                                src={cover?.imageUrl}
                                alt="Cover option"
                                width={200}
                                height={140}
                                className="h-[70px] w-full rounded-md object-cover"
                            />
                        </div>
                    ))}
                </div>

                {/* Paste-your-own URL */}
                <div className="mt-3 space-y-2">
                    <Input
                        type="url"
                        placeholder="Or paste an image / GIF / video URL"
                        value={customUrl}
                        onChange={(e) => {
                            setCustomUrl(e.target.value);
                            // Selecting the custom URL as you type keeps Update in sync.
                            if (e.target.value.trim()) setSelectedCover(e.target.value.trim());
                        }}
                    />
                    {trimmedCustom && (
                        <div
                            onClick={() => setSelectedCover(trimmedCustom)}
                            className={`${isSelected(trimmedCustom) && 'border-primary border-2'} p-1 rounded-md cursor-pointer w-full`}
                        >
                            <CoverMedia
                                src={trimmedCustom}
                                alt="Custom cover preview"
                                width={400}
                                height={100}
                                className="h-[100px] w-full rounded-md object-cover"
                            />
                        </div>
                    )}
                    {trimmedCustom && (
                        <p className="text-xs text-gray-400">
                            Detected type: {coverType(trimmedCustom)}
                        </p>
                    )}
                </div>

                <DialogFooter className="">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            Close
                        </Button>
                    </DialogClose>
                    <DialogClose asChild>
                        <Button
                            type="button"
                            disabled={!selectedCover}
                            onClick={() => selectedCover && setNewCover(selectedCover)}
                        >
                            Update
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default CoverPicker
