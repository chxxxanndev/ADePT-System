import { useState } from 'react';
import { NameTooltip } from './NameTooltip';
import "../../styles/ExpandableText.css";

export const TABLE_NAME_CHAR_LIMIT = 28;

interface ExpandableTextProps {
    // Full text to display. 
    text: string | null | undefined;
    // Character count before truncating. Defaults to TABLE_NAME_CHAR_LIMIT. 
    limit?: number;
    // Optional class applied to the wrapping <span> (e.g. to reuse an existing cell class like "tr-declarant" or "pp-client-name").
    className?: string;
}

export function ExpandableText({ text, limit = TABLE_NAME_CHAR_LIMIT, className = '' }: ExpandableTextProps) {
    const [expanded, setExpanded] = useState(false);
    const value = text?.trim() || '—';
    const isLong = value.length > limit;

    if (!isLong) {
        return <span className={className}>{value}</span>;
    }

    return (
        <span className={`expandable-text ${className}`}>
            {expanded ? (
                <span
                    className="expandable-text-label name-tip name-tip--clickable"
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(false);
                    }}
                >
                    {value}
                </span>
            ) : (
                <NameTooltip value={value} className="expandable-text-label">
                    {`${value.slice(0, limit).trimEnd()}…`}
                </NameTooltip>
            )}
            <button
                type="button"
                className="expandable-text-toggle"
                onClick={(e) => {
                    e.stopPropagation();
                    setExpanded((v) => !v);
                }}
            >
                {expanded ? 'See less' : 'See more'}
            </button>
        </span>
    );
}