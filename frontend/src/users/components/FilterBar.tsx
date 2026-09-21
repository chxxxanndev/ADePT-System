import type { TransactionFilters } from '../types/transaction';
import { DateRangePicker } from './DateRangePicker';
import { DocumentTypeFilter } from './DocumentTypeFilter';
import { X } from 'lucide-react';

interface FilterBarProps {
    filters: TransactionFilters;
    onChange: (filters: TransactionFilters) => void;
    onReset: () => void;
}

export function FilterBar({ filters, onChange, onReset }: FilterBarProps) {
    const hasPeriod = !!(filters.dateFrom || filters.dateTo);

    return (
        <>
            <DocumentTypeFilter
                value={filters.documentType ?? 'All'}
                onChange={(documentType) => onChange({ ...filters, documentType })}
            />

            <DateRangePicker
                dateFrom={filters.dateFrom}
                dateTo={filters.dateTo}
                onChange={(dateFrom, dateTo) => onChange({ ...filters, dateFrom, dateTo })}
            />

            {hasPeriod && (
                <button
                    type="button"
                    className="tr-filter-reset tr-filter-reset--danger"
                    onClick={onReset}
                    title="Clear the date range"
                    aria-label="Clear the date range"
                >
                    <X size={13} />
                    Reset
                </button>
            )}
        </>
    );
}
