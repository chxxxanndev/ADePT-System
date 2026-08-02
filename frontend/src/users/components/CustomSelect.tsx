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
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    disabled,
    allowNone,
    noneLabel = '-- None --',
}) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

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

    return (
        <div className={`cs-container${disabled ? ' cs-disabled' : ''}`} ref={containerRef}>
            <button
                type="button"
                className={`cs-trigger${open ? ' cs-trigger--open' : ''}`}
                onClick={() => !disabled && setOpen(prev => !prev)}
                disabled={disabled}
                title={selected?.sublabel ? `${selected.label} — ${selected.sublabel}` : triggerText}
            >
                <span className="cs-trigger-text">{triggerText}</span>
                <svg className="cs-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div className="cs-menu" role="listbox">
                    {allowNone && (
                        <div
                            className={`cs-option${value === '' ? ' cs-option--selected' : ''}`}
                            onClick={() => { onChange(''); setOpen(false); }}
                        >
                            <span className="cs-option-main">{noneLabel}</span>
                        </div>
                    )}
                    {options.map(opt => (
                        <div
                            key={opt.id}
                            className={`cs-option${opt.id === value ? ' cs-option--selected' : ''}`}
                            onClick={() => { onChange(opt.id); setOpen(false); }}
                        >
                            <span className="cs-option-main">{opt.label}</span>
                            {opt.sublabel && <span className="cs-option-sub">{opt.sublabel}</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};