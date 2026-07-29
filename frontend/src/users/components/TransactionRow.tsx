import type { DeclarantGroup } from '../types/transaction';
import { StatusBadge } from './StatusBadge';

const EyeIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const VoidIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><line x1="7" y1="17" x2="17" y2="7"/></svg>;

interface TransactionRowProps {
    group: DeclarantGroup;
    onViewDetails: (group: DeclarantGroup) => void;
    onReprint: (transactionId: string, docId: string) => void;
    onVoidGroup: (group: DeclarantGroup) => void;
}

// A declarant group can hold several released requests, each with its own
// reference number. Void now opens a checklist (VoidDocumentSelectModal) so
// the user can pick exactly which document(s) to void — it no longer targets
// a single transaction directly from the row.
export function TransactionRow({ group, onViewDetails, onVoidGroup }: TransactionRowProps) {
    const latest = group.transactions[0];
    const referenceLabel = group.transactions.length > 1
        ? `${latest.referenceNumber} (+${group.transactions.length - 1} more)`
        : latest.referenceNumber;

    return (
        <tr className="tr-row" onClick={() => onViewDetails(group)} title="Click to view full transaction details">
            <td className="tr-ref">{referenceLabel}</td>
            <td>
                <span className="tr-declarant">{group.declarantName}</span>
            </td>
            <td>{latest.client.requestedBy}</td>
            <td>{latest.dateRequested}</td>
            <td>{latest.assignedStaff}</td>
            <td><StatusBadge status={latest.status} /></td>
            <td onClick={(e) => e.stopPropagation()}>
                <div className="tr-actions">
                    <button className="tr-action-btn" title="View details" aria-label="View details" onClick={() => onViewDetails(group)}><EyeIcon /></button>
                    <button className="tr-action-btn tr-action-btn--danger" title="Void documents" aria-label="Void documents" onClick={() => onVoidGroup(group)}><VoidIcon /></button>
                </div>
            </td>
        </tr>
    );
}