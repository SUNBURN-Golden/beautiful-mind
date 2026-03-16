import { Input } from '@/components/ui-kit';
import { ReferenceDetailsCard } from '@/components/screen-patterns';

type AppealStatusSectionProps = {
    existingAppeal: {
        id: string;
        status: string;
        created_at: string;
    } | null;
};

export function AppealStatusSection({ existingAppeal }: AppealStatusSectionProps) {
    if (!existingAppeal) {
        return null;
    }

    return (
        <ReferenceDetailsCard
            className="mt-4 text-sm text-slate-700"
            rows={[
                { label: 'Latest appeal ID', value: <span className="font-mono text-xs">{existingAppeal.id}</span> },
                { label: 'Status', value: existingAppeal.status },
                { label: 'Received at', value: existingAppeal.created_at },
            ]}
        />
    );
}

type AppealFormSectionProps = {
    reasonCode: string;
    statement: string;
    evidenceRef: string;
    submitting: boolean;
    onReasonCodeChange: (value: string) => void;
    onStatementChange: (value: string) => void;
    onEvidenceRefChange: (value: string) => void;
    reasonOptions: ReadonlyArray<{ value: string; label: string }>;
};

export function AppealFormSection({
    reasonCode,
    statement,
    evidenceRef,
    submitting,
    onReasonCodeChange,
    onStatementChange,
    onEvidenceRefChange,
    reasonOptions,
}: AppealFormSectionProps) {
    return (
        <>
            <label className="mb-4 grid gap-2 text-[13px] font-medium text-slate-600">
                <span>Appeal reason</span>
                <select
                    className="liquid-input"
                    value={reasonCode}
                    onChange={(event) => onReasonCodeChange(event.target.value)}
                    disabled={submitting}
                >
                    {reasonOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
            </label>

            <label className="mt-4 grid gap-2 text-[14px] text-slate-700">
                <span>Detailed statement</span>
                <textarea
                    className="liquid-input min-h-36"
                    value={statement}
                    onChange={(event) => onStatementChange(event.target.value)}
                    placeholder="Explain why you believe this decision should be reviewed."
                    required
                    disabled={submitting}
                />
            </label>

            <Input
                label="Evidence reference ID (optional)"
                value={evidenceRef}
                onChange={(event) => onEvidenceRefChange(event.target.value)}
                placeholder="Off-chain evidence reference"
                disabled={submitting}
            />
        </>
    );
}
