import { ChevronDown } from 'lucide-react';
import type { DocumentTypeFilterValue } from '../../utils/documentType';
import '../styles/select.css';

const DOC_TYPE_OPTIONS: { value: DocumentTypeFilterValue; label: string }[] = [
    { value: 'All', label: 'All Documents' },
    { value: 'Tax Declaration', label: 'Tax Declaration' },
    { value: 'Landholding', label: 'Landholding' },
    { value: 'No Land Holding', label: 'No Landholding' },
];

interface DocumentTypeFilterProps {
    value: DocumentTypeFilterValue;
    onChange: (value: DocumentTypeFilterValue) => void;
}

/** Shared Document Type dropdown — Transaction Registry, Archive
 *  Management, and Reports & Analytics all render this same control,
 *  styled with the unified .adt-select design. */
export function DocumentTypeFilter({ value, onChange }: DocumentTypeFilterProps) {
    return (
        <div className="adt-select-wrap">
            <select
                className="adt-select"
                value={value}
                onChange={(e) => onChange(e.target.value as DocumentTypeFilterValue)}
                aria-label="Filter by document type"
            >
                {DOC_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
            <ChevronDown size={14} className="adt-select-chevron" />
        </div>
    );
}
