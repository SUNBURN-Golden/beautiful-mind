'use client';

import React, { useRef, useEffect } from 'react';
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

    // 모바일 스크롤 및 브라우저 기본 터치 액션(풀투리프레시 등) 오작동 방지 로직
    useEffect(() => {
        if (isOpen) {
            const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.paddingRight = `${scrollBarWidth}px`; // 스크롤바 보정
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
    };

    const handleSave = () => {
        if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
            const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
            onSave(dataUrl);
            onClose();
        } else {
            alert('서명을 입력해주세요.');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>온보딩 확약서 서명</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4">
                    <p className="text-sm text-gray-500 text-center">
                        본인은 위 내용에 전적으로 동의하며, 허위 정보 제공 또는 규정 위반 시 패널티가 부과될 수 있음을 확인합니다.
                    </p>
                    <div className="border-2 border-dashed border-gray-300 rounded-md w-full h-48 relative overflow-hidden bg-gray-50">
                        <SignatureCanvas
                            ref={sigCanvas}
                            penColor="black"
                            canvasProps={{
                                className: 'w-full h-full absolute top-0 left-0',
                                style: { touchAction: 'none' } // 터치 액션 강제
                            }}
                        />
                    </div>
                    <div className="flex w-full justify-between gap-2">
                        <Button variant="outline" onClick={handleClear} className="w-1/2">
                            지우기
                        </Button>
                        <Button onClick={handleSave} className="w-1/2 bg-black text-white hover:bg-gray-800">
                            서명 완료
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
