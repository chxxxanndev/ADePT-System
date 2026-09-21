import type { DeclarantGroup } from '../types/transaction';
import { StatusBadge } from './StatusBadge';
import { ExpandableText } from './common/ExpandableText';
import { getDocPillMeta, getDocumentTypeFromReference } from '../../utils/documentType';
import { formatDateTime } from '../../utils/dateTime';

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
            <tr className="tr-group-header-row">
                <td colSpan={COLUMN_COUNT}>
                    {rowCount} document{rowCount !== 1 && 's'}
                </td>
            </tr>

            {transactions.map((t, idx) => {
                const typeFromRef = getDocumentTypeFromReference(t.referenceNumber);
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

                        <td><ExpandableText text={t.client.declarantName} className="tr-declarant" /></td>
                        <td><ExpandableText text={t.client.requestedBy} /></td>
                        <td>{formatDateTime(t.requestedAt ?? t.dateRequested)}</td>
                        <td>{t.releasedAt || t.dateReleased ? formatDateTime(t.releasedAt ?? t.dateReleased) : '—'}</td>
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