import type { TransactionFilters, DocumentType } from '../types/transaction';
import { DateRangePicker } from './DateRangePicker';

const DOC_TYPE_OPTIONS: (DocumentType | 'All')[] = [
    'All',
    'Tax Declaration',
    'Certificate of Landholding',
    'Certificate of No Landholding',
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
                value={filters.documentType}
                onChange={(e) => onChange({ ...filters, documentType: e.target.value as DocumentType | 'All' })}
                aria-label="Filter by document type"
            >
                {DOC_TYPE_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d === 'All' ? 'All Document Types' : d}</option>
                ))}
            </select>

            <DateRangePicker
                dateFrom={filters.dateFrom}
                dateTo={filters.dateTo}
                onChange={(dateFrom, dateTo) => onChange({ ...filters, dateFrom, dateTo })}
            />

            <button type="button" className="tr-filter-reset" onClick={onReset}>
                Reset Filters
            </button>
        </>
    );
}