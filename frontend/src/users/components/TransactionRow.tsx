import { useState, useRef, useEffect } from 'react';
import type { Transaction } from '../types/transaction';
import { StatusBadge } from './StatusBadge';

const EyeIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
);

const PrintIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"></polyline>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
        <rect x="6" y="14" width="12" height="8"></rect>
    </svg>
);

const FileDownIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="12" y1="18" x2="12" y2="12"></line>
        <polyline points="9 15 12 18 15 15"></polyline>
    </svg>
);

const MoreIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="5" cy="12" r="2"></circle>
        <circle cx="12" cy="12" r="2"></circle>
        <circle cx="19" cy="12" r="2"></circle>
    </svg>
);

interface TransactionRowProps {
    transaction: Transaction;
    onViewDetails: (transaction: Transaction) => void;
    onPrint: (transaction: Transaction) => void;
    onGeneratePdf: (transaction: Transaction) => void;
    onVoid: (transaction: Transaction) => void;
    onArchive: (transaction: Transaction) => void;
}

export function TransactionRow({ transaction, onViewDetails, onPrint, onGeneratePdf, onVoid, onArchive }: TransactionRowProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <tr className="tr-row" onClick={() => onViewDetails(transaction)}>
            <td className="tr-ref">{transaction.referenceNumber}</td>
            <td>
                <span className="tr-declarant">{transaction.client.declarantName}</span>
                <span className="tr-declarant-sub">{transaction.property.taxDeclarationNo}</span>
            </td>
            <td>{transaction.client.requestedBy}</td>
            <td>
                {transaction.requestedDocuments.map((doc) => (
                    <span key={doc} className="tr-doc-pill">{doc}</span>
                ))}
            </td>
            <td>{transaction.dateRequested}</td>
            <td>{transaction.assignedStaff}</td>
            <td><StatusBadge status={transaction.status} /></td>
            <td onClick={(e) => e.stopPropagation()}>
                <div className="tr-actions" ref={menuRef}>
                    <button className="tr-action-btn" title="View Details" onClick={() => onViewDetails(transaction)}>
                        <EyeIcon />
                    </button>
                    <button className="tr-action-btn" title="Print" onClick={() => onPrint(transaction)}>
                        <PrintIcon />
                    </button>
                    <button className="tr-action-btn" title="Generate PDF" onClick={() => onGeneratePdf(transaction)}>
                        <FileDownIcon />
                    </button>
                    <button className="tr-action-btn tr-action-btn--more" title="More actions" onClick={() => setMenuOpen((v) => !v)}>
                        <MoreIcon />
                    </button>

                    {menuOpen && (
                        <div className="tr-more-menu">
                            <button onClick={() => { setMenuOpen(false); onArchive(transaction); }}>Move to Archive</button>
                            <button className="tr-danger" onClick={() => { setMenuOpen(false); onVoid(transaction); }}>Void Transaction</button>
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
}
