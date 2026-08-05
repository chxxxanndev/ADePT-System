import React, { useEffect, useRef, useState } from 'react';
import '../styles/CustomSelect.css';

export interface CustomSelectOption {
    id: string;
    label: string;
    sublabel?: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (id: string) => void;
    options: CustomSelectOption[];
    placeholder?: string;
    disabled?: boolean;
    allowNone?: boolean;
    noneLabel?: string;
    searchable?: boolean;
    searchPlaceholder?: string;
    inlineSearch?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    disabled,
    allowNone,
    noneLabel = '-- None --',
    searchable,
    searchPlaceholder = 'Search...',
    inlineSearch,
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selected = options.find(o => o.id === value);
    const triggerText = selected ? selected.label : (value === '' && allowNone ? noneLabel : placeholder);

    const normalizedQuery = query.trim().toLowerCase();
    const filteredOptions = normalizedQuery
        ? options.filter(o =>
            o.label.toLowerCase().includes(normalizedQuery) ||
            (o.sublabel ?? '').toLowerCase().includes(normalizedQuery))
        : options;

    const handleTriggerClick = () => {
        if (disabled) return;
        const next = !open;
        setOpen(next);
        if (next && searchable) {
            setQuery('');
            searchRef.current?.focus();
        }
        if (next && inlineSearch) {
            setQuery('');
        }
    };

    const handleSelect = (id: string) => {
        onChange(id);
        setOpen(false);
        setQuery('');
    };

    return (
        <div className={`cs-container${disabled ? ' cs-disabled' : ''}${searchable ? ' cs-searchable' : ''}`} ref={containerRef}>
            {/* Always-visible search bar — sits above the dropdown trigger so
                the search function is immediately obvious. Typing filters the
                list below and auto-opens the menu. */}
            {searchable && !disabled && (
                <div className="cs-searchbar">
                    <svg className="cs-searchbar-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="7" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                        ref={searchRef}
                        type="text"
                        className="cs-searchbar-input"
                        placeholder={searchPlaceholder}
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') setOpen(false);
                            if (e.key === 'Enter') {
                                const first = filteredOptions[0];
                                if (first) handleSelect(first.id);
                            }
                        }}
                    />
                </div>
            )}

            {/* Inline search: trigger becomes a text input when open */}
            {inlineSearch && open && !disabled ? (
                <input
                    ref={searchRef}
                    type="text"
                    className={`cs-trigger cs-trigger--open`}
                    placeholder="Type to search..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') { setOpen(false); setQuery(''); }
                        if (e.key === 'Enter') {
                            const first = filteredOptions[0];
                            if (first) handleSelect(first.id);
                        }
                    }}
                    autoFocus
                />
            ) : (
                <button
                    type="button"
                    className={`cs-trigger${open ? ' cs-trigger--open' : ''}`}
                    onClick={handleTriggerClick}
                    disabled={disabled}
                    title={selected?.sublabel ? `${selected.label} — ${selected.sublabel}` : triggerText}
                >
                    <span className="cs-trigger-text">{triggerText}</span>
                    <svg className="cs-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            )}

            {open && (
                <div className="cs-menu" role="listbox">
                    <div className="cs-options">
                        {allowNone && (
                            <div
                                className={`cs-option${value === '' ? ' cs-option--selected' : ''}`}
                                onClick={() => handleSelect('')}
                            >
                                <span className="cs-option-main">{noneLabel}</span>
                            </div>
                        )}
                        {filteredOptions.map(opt => (
                            <div
                                key={opt.id}
                                className={`cs-option${opt.id === value ? ' cs-option--selected' : ''}`}
                                onClick={() => handleSelect(opt.id)}
                            >
                                <span className="cs-option-main">{opt.label}</span>
                                {opt.sublabel && <span className="cs-option-sub">{opt.sublabel}</span>}
                            </div>
                        ))}
                        {filteredOptions.length === 0 && (
                            <div className="cs-empty">No results found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};