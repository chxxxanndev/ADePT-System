import { ADePTSelect } from './ADePTSelect';
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
 *  Management, Void & Amend, Reprint, and Reports & Analytics all
 *  render this same control, styled with the unified .adt-select
 *  pill and the shared ADePT dropdown panel design. */
export function DocumentTypeFilter({ value, onChange }: DocumentTypeFilterProps) {
    return (
        <ADePTSelect
            value={value}
            onChange={onChange}
            options={DOC_TYPE_OPTIONS}
            ariaLabel="Filter by document type"
        />
    );
}
