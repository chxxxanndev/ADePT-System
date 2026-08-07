import type { DeclarantGroup } from '../types/transaction';
import { StatusBadge } from './StatusBadge';
import { ExpandableText } from './common/ExpandableText';
import { getDocPillMeta, getDocumentTypeFromReference } from '../../utils/documentType';

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
                // The reference prefix is the source of truth for the
                // document type (TD → Tax Declaration, LH → Landholding,
                // NLH → No Land Holding). It always wins over the backend's
                // request_documents name, which can be empty or oddly
                // spelled — so every row gets the correct icon + color.
                const typeFromRef = getDocumentTypeFromReference(t.referenceNumber);

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
                                    const meta = getDocPillMeta(typeFromRef ?? doc?.documentType ?? '');
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
                        <td><ExpandableText text={t.client.declarantName} className="tr-declarant" /></td>

                        {/* Requested By is the group key, so it's identical
                            for every row — repeats per row like
                            PendingPayment's Requested By column does. */}
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
                            <td className="tr-actions-cell" rowSpan={rowCount}>
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