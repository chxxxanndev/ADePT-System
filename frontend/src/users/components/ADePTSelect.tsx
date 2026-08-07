import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { FloatingPopover } from '../../shared/components/FloatingPopover';
import '../styles/select.css';

export interface ADePTSelectOption<T extends string = string> {
    value: T;
    label: string;
}

interface ADePTSelectProps<T extends string = string> {
    value: T;
    onChange: (value: T) => void;
    options: ADePTSelectOption<T>[];
    ariaLabel?: string;
    variant?: 'default' | 'sm' | 'block';
    disabled?: boolean;
    className?: string;
}

/** Custom dropdown with the ADePT panel design — replaces native
 *  <select> elements, whose panels are rendered by the OS and can
 *  therefore never carry the rounded/shadowed ADePT look. The trigger
 *  keeps the exact .adt-select pill; the panel opens in a portal with
 *  the shared white rounded design. */
export function ADePTSelect<T extends string>({
    value,
    onChange,
    options,
    ariaLabel,
    variant = 'default',
    disabled = false,
    className,
}: ADePTSelectProps<T>) {
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelMinWidth = triggerRef.current?.offsetWidth ?? 190;

    const selected = options.find((o) => o.value === value);

    const handleKeyDown = (e: ReactKeyboardEvent) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((prev) => !prev);
        } else if (open && e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % options.length);
        } else if (open && e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => (i - 1 + options.length) % options.length);
        } else if (open && e.key === 'Home') {
            e.preventDefault();
            setActiveIndex(0);
        } else if (open && e.key === 'End') {
            e.preventDefault();
            setActiveIndex(options.length - 1);
        }
    };

    useEffect(() => {
        if (!open) setActiveIndex(-1);
    }, [open]);

    const triggerClassName =
        `adt-select${variant === 'sm' ? ' adt-select--sm' : ''}` +
        (variant === 'block' ? ' adt-select--block' : '') +
        ' adt-select-trigger';

    return (
        <div className={`adt-select-wrap ${className ?? ''}`.trim()}>
            <button
                ref={triggerRef}
                type="button"
                className={triggerClassName}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={ariaLabel}
                disabled={disabled}
                onClick={() => setOpen((prev) => !prev)}
                onKeyDown={handleKeyDown}
            >
                <span className="adt-select-label">{selected?.label ?? ''}</span>
                <ChevronDown size={14} className="adt-select-chevron" />
            </button>

            <FloatingPopover
                open={open}
                triggerRef={triggerRef}
                align="left"
                onClose={() => setOpen(false)}
                className="adt-select-panel"
                style={{ minWidth: Math.max(panelMinWidth, 160) }}
            >
                {options.length === 0 && <div className="adt-select-empty">No options available</div>}
                {options.map((opt, i) => (
                    <button
                        key={opt.value}
                        type="button"
                        role="option"
                        aria-selected={opt.value === value}
                        className={`adt-select-option${i === activeIndex ? ' active' : ''}${opt.value === value ? ' selected' : ''}`}
                        onMouseEnter={() => setActiveIndex(i)}
                        onClick={() => {
                            onChange(opt.value);
                            setOpen(false);
                        }}
                    >
                        {opt.label}
                    </button>
                ))}
            </FloatingPopover>
        </div>
    );
}
