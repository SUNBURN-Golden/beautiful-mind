"use client";

import React, { PropsWithChildren } from "react";

export function Stepper({ currentStep = 0, totalSteps = 0 }: { currentStep?: number; totalSteps?: number }) {
    return (
        <div className="flex gap-2 mb-4" style={{ fontSize: 12, opacity: 0.8 }}>
            Step {currentStep}/{totalSteps}
        </div>
    );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { submitting?: boolean }) {
    return (
        <button
            {...props}
            style={{
                padding: "12px 16px",
                borderRadius: 8,
                border: "none",
                background: props.disabled ? "#ccc" : "#0F172A",
                color: "#fff",
                width: "100%",
                fontWeight: 600,
                cursor: props.disabled ? "not-allowed" : "pointer",
                transition: "opacity 0.2s",
                ...(props.style ?? {}),
            }}
        >
            {props.submitting ? "Processing..." : props.children}
        </button>
    );
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            style={{
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid #E5E5E5",
                background: "transparent",
                color: "#111",
                width: "100%",
                fontWeight: 500,
                cursor: "pointer",
                ...(props.style ?? {}),
            }}
        />
    );
}

export function SupportCTA({ children }: PropsWithChildren) {
    return <div style={{ marginTop: "auto", paddingTop: 32, textAlign: "center", fontSize: 13, color: "#888" }}>{children ?? "도움이 필요하신가요? 고객센터에 문의하세요."}</div>;
}

export function Toast({ message, type = 'info' }: { message?: string, type?: 'info' | 'error' | 'success' }) {
    if (!message) return null;
    const colors = {
        info: "#F1F5F9",
        error: "#FEF2F2",
        success: "#ECFDF5"
    };
    return (
        <div style={{ marginBottom: 16, padding: 12, background: colors[type], borderRadius: 8, fontSize: 14 }}>
            {message}
        </div>
    );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
    return (
        <div style={{ display: "grid", gap: 12 }}>
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} style={{ height: 16, background: "#F1F5F9", borderRadius: 8, width: i === lines - 1 ? "60%" : "100%" }} />
            ))}
        </div>
    );
}

export function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
    return (
        <div className="flex flex-col gap-2 mb-4" style={{ width: "100%" }}>
            {label && <label className="text-[13px] font-medium text-[#555]">{label}</label>}
            <input
                {...props}
                style={{
                    padding: "12px",
                    borderRadius: 8,
                    border: "1px solid #E5E5E5",
                    width: "100%",
                    fontSize: 15,
                    boxSizing: "border-box",
                    ...(props.style ?? {}),
                }}
            />
        </div>
    );
}

export function ConsentItem({ label, checked, onChange, link }: { label: string; checked?: boolean; onChange?: () => void; link?: string }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
                <input type="checkbox" checked={!!checked} onChange={onChange} style={{ width: 18, height: 18 }} />
                <span className="text-[15px] text-[#333]">{label}</span>
            </label>
            {link && (
                <a href={link} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginLeft: 30, marginTop: 4, fontSize: 12, color: "#3B82F6", textDecoration: "underline" }}>
                    약관 보기
                </a>
            )}
        </div>
    );
}

export function DocumentViewer({ text }: { text?: string }) {
    return (
        <div style={{ border: "1px solid #E5E5E5", borderRadius: 12, padding: 16, background: "#F9FAFA", maxHeight: 200, overflowY: "auto", fontSize: 13, lineHeight: 1.6, color: "#555", marginBottom: 24 }}>
            {text ?? "문서 내용을 불러올 수 없습니다."}
        </div>
    );
}

export function SignaturePad({ onSign }: { onSign?: (data: string) => void }) {
    return (
        <div style={{ border: "1px solid #E5E5E5", borderRadius: 12, padding: 16, background: "#fff", height: 160, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, cursor: "crosshair", position: "relative" }} onClick={() => onSign?.("data:image/png;base64,STABLE_PLACEHOLDER")}>
            <span style={{ opacity: 0.4, fontSize: 13 }}>이곳에 서명하십시오 (클릭하여 시뮬레이션)</span>
        </div>
    );
}

export function AuditLogRow({ action, timestamp, hash }: { action: string; timestamp?: string; hash?: string }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingTop: 8, paddingBottom: 8, borderBottom: "1px solid #F1F5F9", fontSize: 12 }}>
            <span style={{ fontWeight: 500, color: "#334155" }}>{action}</span>
            <span style={{ opacity: 0.6, color: "#64748B" }}>{timestamp?.split('T')[0]}</span>
        </div>
    );
}
