import type { TransactionFilters, TransactionStatus, DocumentType } from '../types/transaction';

const STATUS_OPTIONS: (TransactionStatus | 'All')[] = [
    'All',
    'Pending',
    'For Payment',
    'Payment Verified',
    'Processing',
    'Ready for Release',
    'Released',
    'Void',
    'Archived',
];

const DOC_TYPE_OPTIONS: (DocumentType | 'All')[] = [
    'All',
    'Tax Declaration',
    'Certificate of Land Holding',
    'Certificate of No Landholding',
    'Certified True Copy',
];

interface FilterBarProps {
    filters: TransactionFilters;
    onChange: (filters: TransactionFilters) => void;
    onReset: () => void;
}

export function FilterBar({ filters, onChange, onReset }: FilterBarProps) {
    return (
        <>
            <select
                className="tr-filter-select"
                value={filters.status}
                onChange={(e) => onChange({ ...filters, status: e.target.value as TransactionStatus | 'All' })}
                aria-label="Filter by status"
            >
                {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
                ))}
            </select>

            <select
                className="tr-filter-select"
                value={filters.documentType}
                onChange={(e) => onChange({ ...filters, documentType: e.target.value as DocumentType | 'All' })}
                aria-label="Filter by document type"
            >
                {DOC_TYPE_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d === 'All' ? 'All Document Types' : d}</option>
                ))}
            </select>

            <div className="tr-filter-date">
                <input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
                    aria-label="Date from"
                />
                <span>to</span>
                <input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
                    aria-label="Date to"
                />
            </div>

            <button type="button" className="tr-filter-reset" onClick={onReset}>
                Reset Filters
            </button>
        </>
    );
}
