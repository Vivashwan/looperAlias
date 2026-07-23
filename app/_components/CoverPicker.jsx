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
import CoverOption from '../_shared/CoverOption'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

function CoverPicker({ children, setNewCover }) {
    const [selectedCover, setSelectedCover] = useState();
    return (
        <Dialog>
            <DialogTrigger className='w-full'>
                {children}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update Cover</DialogTitle>
                    {/* DialogDescription renders a <p>, so the image grid lives
                        as a sibling — a grid of <div>s inside a <p> is invalid
                        HTML and triggers a hydration warning. */}
                    <DialogDescription>
                        Pick a cover image for this document.
                    </DialogDescription>
                </DialogHeader>
                <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mt-3'>
                    {CoverOption.map((cover) => (
                        <div key={cover.imageUrl}
                            onClick={() => setSelectedCover(cover?.imageUrl)}
                            className={`${selectedCover == cover?.imageUrl && 'border-primary border-2'} p-1 rounded-md cursor-pointer`}
                        >
                            <Image src={cover?.imageUrl} width={200} height={140} alt="Cover option" className="h-[70px] w-full rounded-md object-cover" />
                        </div>
                    ))}
                </div>
                <DialogFooter className="">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            Close
                        </Button>
                    </DialogClose>
                    <DialogClose asChild>
                        <Button type="button" onClick={() => setNewCover(selectedCover)}>
                            Update
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default CoverPicker