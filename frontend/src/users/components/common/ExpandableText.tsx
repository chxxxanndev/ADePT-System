import { useState } from 'react';
import "../../styles/ExpandableText.css";

/**
 * Shared character-limit for any table cell that shows a person/entity name
 * (declarant, requester, etc). Bump this in ONE place to change truncation
 * behavior everywhere it's used — PendingPayment, PendingForRelease,
 * TransactionRegistry, CertifiedTrueCopy, VoidAndAmend, ArchiveManagement,
 * and Reports & Analytics all import this same constant.
 */
export const TABLE_NAME_CHAR_LIMIT = 28;

interface ExpandableTextProps {
    /** Full text to display. */
    text: string | null | undefined;
    /** Character count before truncating. Defaults to TABLE_NAME_CHAR_LIMIT. */
    limit?: number;
    /** Optional class applied to the wrapping <span> (e.g. to reuse an
     *  existing cell class like "tr-declarant" or "pp-client-name"). */
    className?: string;
}

/**
 * Renders `text`, truncated to `limit` characters with a "See more" toggle
 * when it's longer than that. Click expands/collapses in place — no modal,
 * no layout shift outside the cell itself. Falls back to "—" for empty text
 * and skips the toggle entirely when the text already fits.
 */
export function ExpandableText({ text, limit = TABLE_NAME_CHAR_LIMIT, className = '' }: ExpandableTextProps) {
    const [expanded, setExpanded] = useState(false);
    const value = text?.trim() || '—';
    const isLong = value.length > limit;

    if (!isLong) {
        return <span className={className}>{value}</span>;
    }

    return (
        <span className={`expandable-text ${className}`} title={expanded ? undefined : value}>
            {expanded ? value : `${value.slice(0, limit).trimEnd()}…`}
            <button
                type="button"
                className="expandable-text-toggle"
                onClick={(e) => {
                    // Table rows are often clickable (row-level onClick for
                    // selection/navigation) — stop the toggle from also
                    // triggering that.
                    e.stopPropagation();
                    setExpanded((v) => !v);
                }}
            >
                {expanded ? 'See less' : 'See more'}
            </button>
        </span>
    );
}