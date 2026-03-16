'use client';

import React, { useRef, useEffect, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

interface SignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (base64Url: string) => void;
}

export function SignatureModal({ isOpen, onClose, onSave }: SignatureModalProps) {
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [error, setError] = useState<string | null>(null);

    // Prevent background scroll and browser touch gestures from interfering with signing.
    useEffect(() => {
        if (isOpen) {
            const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.paddingRight = `${scrollBarWidth}px`;
        } else {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.paddingRight = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.paddingRight = '';
        };
    }, [isOpen]);

    const handleClear = () => {
        sigCanvas.current?.clear();
        setError(null);
    };

    const handleSave = () => {
        if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
            const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
            onSave(dataUrl);
            onClose();
            setError(null);
        } else {
            setError('Please add your signature before continuing.');
        }
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    setError(null);
                    onClose();
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Admission agreement signature</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4">
                    <p className="text-center text-sm text-[#6e6e73]">
                        Sign to confirm that the information above is accurate and that policy violations may lead to restrictions or penalties.
                    </p>
                    <div className="relative h-48 w-full overflow-hidden rounded-xl border-2 border-dashed border-[#d2d2d7] bg-[#fbfbfd]">
                        <SignatureCanvas
                            ref={sigCanvas}
                            penColor="black"
                            canvasProps={{
                                className: 'w-full h-full absolute top-0 left-0',
                                style: { touchAction: 'none' }
                            }}
                        />
                    </div>
                    {error && (
                        <p className="w-full rounded-lg border border-[#f3d1d1] bg-[#fff5f5] px-3 py-2 text-xs text-[#b42318]">
                            {error}
                        </p>
                    )}
                    <div className="flex w-full justify-between gap-2">
                        <Button variant="outline" onClick={handleClear} className="w-1/2">
                            Clear
                        </Button>
                        <Button onClick={handleSave} className="w-1/2">
                            Save signature
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
