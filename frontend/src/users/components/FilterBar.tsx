import type { TransactionFilters } from '../types/transaction';
import { DateRangePicker } from './DateRangePicker';
import { DocumentTypeFilter } from './DocumentTypeFilter';

interface FilterBarProps {
    filters: TransactionFilters;
    onChange: (filters: TransactionFilters) => void;
    onReset: () => void;
}

export function FilterBar({ filters, onChange, onReset }: FilterBarProps) {
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

            <button type="button" className="tr-filter-reset" onClick={onReset}>
                Reset Filters
            </button>
        </>
    );
}
