import type { ReactElement } from 'react';
import type { DeclarantGroup, DocumentType, RequestedDocumentItem, Transaction } from '../types/transaction';
import { StatusBadge } from './StatusBadge';

// Pill icons for the reference-number stack — mirrors the icon set used in
// PendingPayment.tsx (LandholdingIcon / NoLandholdingIcon / TaxDeclarationIcon)
// so the same document type reads identically across both screens.
const NoLandholdingIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><line x1="6" y1="18" x2="18" y2="6"/></svg>;
const LandholdingIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/></svg>;
const TaxDeclarationIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h9l3 3v17H6z"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>;
const GenericDocIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l4 4v14H7z"/></svg>;

interface DocPillMeta {
    className: string;
    Icon: () => ReactElement;
}

// Maps a document's type to how its reference-number pill should look.
// Falls back to a neutral style for anything not in the known list
// (e.g. 'Certified True Copy', or a future type added on the backend).
function getDocPillMeta(documentType: DocumentType | string): DocPillMeta {
    switch (documentType) {
        case 'Certificate of No Landholding':
            return { className: 'tr-doc-pill--nlh', Icon: NoLandholdingIcon };
        case 'Certificate of Land Holding':
            return { className: 'tr-doc-pill--lh', Icon: LandholdingIcon };
        case 'Tax Declaration':
            return { className: 'tr-doc-pill--td', Icon: TaxDeclarationIcon };
        default:
            return { className: '', Icon: GenericDocIcon };
    }
}

interface DocLine {
    key: string;
    referenceNumber: string;
    doc: RequestedDocumentItem | undefined;
    orNumber: string | null;
    orJustification: string | null | undefined;
}

// Flattens every (transaction, requestedDocument) pair in the group into one
// line per pill/row — each line carries its parent transaction's reference
// number and payment info, color-coded by that specific document's type.
// Kept as one shared list so Reference Number, OR Number, and OR
// Justification all stack in the same order and stay aligned row-for-row.
function buildDocLines(transactions: Transaction[]): DocLine[] {
    return transactions.flatMap((t): DocLine[] => {
        const base = {
            referenceNumber: t.referenceNumber,
            orNumber: t.payment.orNumber,
            orJustification: t.payment.orJustification ?? null,
        };
        return t.requestedDocuments.length > 0
            ? t.requestedDocuments.map((doc) => ({ key: `${t.id}-${doc.id}`, doc, ...base }))
            : [{ key: t.id, doc: undefined, ...base }];
    });
}

interface TransactionRowProps {
    group: DeclarantGroup;
    onViewDetails: (group: DeclarantGroup) => void;
}

// A declarant group can hold several released requests, each with its own
// reference number. Void now lives entirely inside TransactionDetails
// (per-transaction, in its Actions card) — the row itself only opens details.
export function TransactionRow({ group, onViewDetails }: TransactionRowProps) {
    const latest = group.transactions[0];
    const docLines = buildDocLines(group.transactions);

    return (
        <tr className="tr-row">
            <td className="tr-ref">
                <div className="tr-stack-count-label">
                    {docLines.length} document{docLines.length !== 1 && 's'}
                </div>
                <div className="tr-stack-list">
                    {docLines.map(({ key, referenceNumber, doc }) => {
                        const meta = getDocPillMeta(doc?.documentType ?? '');
                        return (
                            <div className="tr-stack-line" key={key}>
                                <span className={`tr-doc-pill ${meta.className}`}>
                                    <meta.Icon />
                                    {referenceNumber}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </td>

            <td>
                <span className="tr-declarant">{group.declarantName}</span>
            </td>
            <td>{latest.client.requestedBy}</td>
            <td>{latest.dateRequested}</td>
            <td>{latest.assignedStaff}</td>

            <td>
                <div className="tr-stack-count-label tr-stack-count-label--spacer">&nbsp;</div>
                <div className="tr-stack-list">
                    {docLines.map(({ key, orNumber }) => (
                        <div className="tr-stack-line" key={key}>
                            <span className="tr-or-number">{orNumber || '—'}</span>
                        </div>
                    ))}
                </div>
            </td>

            <td>
                <div className="tr-stack-count-label tr-stack-count-label--spacer">&nbsp;</div>
                <div className="tr-stack-list">
                    {docLines.map(({ key, orJustification }) => (
                        <div className="tr-stack-line" key={key}>
                            <span className={`tr-or-justification${orJustification ? '' : ' tr-or-justification--none'}`}>
                                {orJustification || 'None'}
                            </span>
                        </div>
                    ))}
                </div>
            </td>

            <td><StatusBadge status={latest.status} /></td>
            <td>
                <div className="tr-actions">
                    <button
                        type="button"
                        className="tr-view-details-btn"
                        onClick={() => onViewDetails(group)}
                    >
                        View Details
                    </button>
                </div>
            </td>
        </tr>
    );
}