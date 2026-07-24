import { useState, useRef, useEffect } from 'react';
import type { Transaction } from '../types/transaction';
import { StatusBadge } from './StatusBadge';

// Icons
const EyeIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const MoreIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>;

interface TransactionRowProps {
    transaction: Transaction;
    onViewDetails: (t: Transaction) => void;
    onPrint: (t: Transaction) => void;
    onIssueCTC: (t: Transaction) => void;
    onVoid: (t: Transaction) => void;
    onEdit: (t: Transaction) => void;
    onArchive: (t: Transaction) => void;
    onCancel: (t: Transaction) => void;
}

export function TransactionRow({ transaction, onViewDetails, onPrint, onIssueCTC, onVoid, onEdit, onArchive, onCancel }: TransactionRowProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const status = transaction.status;

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <tr className="tr-row" onClick={() => onViewDetails(transaction)}>
            <td className="tr-ref">{transaction.referenceNumber}</td>
            <td>
                <span className="tr-declarant">{transaction.client.declarantName}</span>
            </td>
            <td>{transaction.client.requestedBy}</td>
            <td>{transaction.requestedDocuments.map(doc => <span key={doc} className="tr-doc-pill">{doc}</span>)}</td>
            <td>{transaction.dateRequested}</td>
            <td>{transaction.assignedStaff}</td>
            <td><StatusBadge status={status} /></td>
            <td onClick={(e) => e.stopPropagation()}>
                <div className="tr-actions" ref={menuRef}>
                    <button className="tr-action-btn" title="Quick View" onClick={() => onViewDetails(transaction)}><EyeIcon /></button>
                    <button className="tr-action-btn tr-action-btn--more" onClick={() => setMenuOpen(!menuOpen)}><MoreIcon /></button>

                    {menuOpen && (
                        <div className="tr-more-menu">
                            {/* DYNAMIC LOGIC BASED ON STATUS */}
                            {status === 'Released' && (
                                <>
                                    <button onClick={() => { setMenuOpen(false); onPrint(transaction); }}>📄 Print Copy</button>
                                    <button onClick={() => { setMenuOpen(false); onIssueCTC(transaction); }}>📑 Issue CTC</button>
                                    <button className="tr-danger" onClick={() => { setMenuOpen(false); onVoid(transaction); }}>⚠️ Void & Amend</button>
                                </>
                            )}

                            {(status === 'Pending' || status === 'For Payment') && (
                                <>
                                    <button onClick={() => { setMenuOpen(false); onEdit(transaction); }}>✏️ Edit Request</button>
                                    <button onClick={() => { setMenuOpen(false); onArchive(transaction); }}>📦 Move to Archive</button>
                                    <button className="tr-danger" onClick={() => { setMenuOpen(false); onCancel(transaction); }}>🚫 Cancel Request</button>
                                </>
                            )}

                            {(status === 'Void' || status === 'Cancelled' || status === 'Archived') && (
                                <button onClick={() => { setMenuOpen(false); onViewDetails(transaction); }}>👁️ View History</button>
                            )}
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
}