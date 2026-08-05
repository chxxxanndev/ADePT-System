import type { ReactElement } from 'react';
import type { DeclarantGroup, DocumentType } from '../types/transaction';
import { StatusBadge } from './StatusBadge';
import { ExpandableText } from './common/ExpandableText';

const TaxDeclarationIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="21" x2="21" y2="21"></line><line x1="6" y1="18" x2="6" y2="11"></line><line x1="10" y1="18" x2="10" y2="11"></line><line x1="14" y1="18" x2="14" y2="11"></line><line x1="18" y1="18" x2="18" y2="11"></line><polygon points="12 3 21 9 3 9"></polygon></svg>;
const LandholdingIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></svg>;
const NoLandholdingIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15l2 2 4-4" /></svg>;
const GenericDocIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l4 4v14H7z" /></svg>;

interface DocPillMeta {
    className: string;
    Icon: () => ReactElement;
}

/**
 * Resolves which document-type pill (and icon) a reference number renders
 * with. The reference number itself encodes the type (NLH- / LH- / TD-), so
 * the prefix is matched first — this keeps NLH-xxxx pills red no matter how
 * the backend spells the document name (casing, whitespace, etc.) — with a
 * case-insensitive document-name fallback for any odd reference formats.
 */
function getDocPillMeta(documentType: DocumentType | string, referenceNumber?: string): DocPillMeta {
    const ref = (referenceNumber || '').toUpperCase();
    const docType = (documentType || '').trim().toLowerCase();

    if (ref.startsWith('NLH') || docType.includes('no landholding')) {
        return { className: 'tr-doc-pill--nlh', Icon: NoLandholdingIcon };
    }
    if (ref.startsWith('LH') || docType.includes('landholding')) {
        return { className: 'tr-doc-pill--lh', Icon: LandholdingIcon };
    }
    if (ref.startsWith('TD') || docType.includes('tax declaration')) {
        return { className: 'tr-doc-pill--td', Icon: TaxDeclarationIcon };
    }
    return { className: '', Icon: GenericDocIcon };
}

interface TransactionRowProps {
    group: DeclarantGroup;
    onViewDetails: (group: DeclarantGroup) => void;
}

const COLUMN_COUNT = 11;

export function TransactionRow({ group, onViewDetails }: TransactionRowProps) {
    const { transactions } = group;
    const rowCount = transactions.length;

    return (
        <>
            {/* Group label row — always rendered, uniform with PendingPayment's
            pp-group-header-row ("1 document" / "2 documents" / etc.),
            regardless of how many transactions are in this group. */}
            <tr className="tr-group-header-row">
                <td colSpan={COLUMN_COUNT}>
                    {rowCount} document{rowCount !== 1 && 's'}
                </td>
            </tr>

            {transactions.map((t, idx) => {
                // A single transaction can itself request multiple document
                // types (e.g. Tax Declaration + Landholding) — that still
                // stacks inside its own row.
                const docs = t.requestedDocuments.length > 0 ? t.requestedDocuments : [undefined];

                return (
                    <tr
                        key={t.id}
                        className={`tr-row${rowCount > 1 && idx !== rowCount - 1 ? ' tr-row-group-mid' : ''}`}
                    >
                        <td className="tr-ref">
                            <div className="tr-stack-list">
                                {docs.map((doc, i) => {
                                    const meta = getDocPillMeta(doc?.documentType ?? '', t.referenceNumber);
                                    return (
                                        <div className="tr-stack-line" key={doc?.id ?? i}>
                                            <span className={`tr-doc-pill ${meta.className}`} title={t.referenceNumber}>
                                                <meta.Icon />
                                                {t.referenceNumber}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </td>

                        {/* Declarant varies per transaction within the group
                            (e.g. Arsenio Noel Jr. vs Spouses Arsenio Noel),
                            so it repeats per row — not rowSpan'd. */}
                        <td><span className="tr-declarant" title={t.client.declarantName}>{t.client.declarantName}</span></td>

                        <td><ExpandableText text={t.client.requestedBy} /></td>

                        <td>{t.dateRequested}</td>
                        <td>{t.dateReleased || '—'}</td>
                        <td>{t.assignedStaff}</td>
                        <td>{t.releasedBy || '—'}</td>
                        <td><span className="tr-or-number">{t.payment.orNumber || '—'}</span></td>
                        <td>
                            <ExpandableText
                                text={t.payment.orJustification || 'OR Unique'}
                                className={`tr-or-justification${t.payment.orJustification ? '' : ' tr-or-justification--none'}`}
                            />
                        </td>
                        <td><StatusBadge status={t.status} /></td>

                        {/* Actions rowSpan's the group — "View" opens every
                            transaction in this requester's group. */}
                        {idx === 0 && (
                            <td rowSpan={rowCount}>
                                <div className="tr-actions">
                                    <button type="button" className="tr-view-details-btn" onClick={() => onViewDetails(group)}>
                                        View
                                    </button>
                                </div>
                            </td>
                        )}
                    </tr>
                );
            })}
        </>
    );
}