import EmojiPicker from 'emoji-picker-react'
import { X } from 'lucide-react'
import React, { useState } from 'react'

function EmojiPickerComponent({ children, setEmojiIcon }) {
    const [openEmojiPicker, setOpenEmojiPicker] = useState(false);
    return (
        <div>
            <div onClick={() => setOpenEmojiPicker(true)}>
                {children}
            </div>
            {openEmojiPicker && (
                <>
                    {/* Tap-away backdrop so the picker can be dismissed without
                        selecting an emoji. */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenEmojiPicker(false)}
                    />
                    <div className="absolute z-20">
                        {/* Explicit close button (esp. for mobile / touch). */}
                        <button
                            type="button"
                            aria-label="Close emoji picker"
                            onClick={() => setOpenEmojiPicker(false)}
                            className="absolute -top-2 -right-2 z-10 rounded-full bg-gray-800 text-white p-1 shadow hover:bg-gray-700"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        <EmojiPicker
                            onEmojiClick={(e) => {
                                setEmojiIcon(e.emoji);
                                setOpenEmojiPicker(false);
                            }}
                        />
                    </div>
                </>
            )}
        </div>
    )
}

export default EmojiPickerComponent
