import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import "../../styles/NameTip.css";

interface NameTooltipProps {
    //Full value shown in the tooltip on hover. 
    value: string;
    //The visible text/children that act as the hover target. 
    children: React.ReactNode;
    // Optional class applied to the hover target (e.g. "expandable-text-label"). 
    className?: string;
}

export function NameTooltip({ value, children, className = '' }: NameTooltipProps) {
    const hostRef = useRef<HTMLSpanElement>(null);
    const tipRef = useRef<HTMLDivElement>(null);
    const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);

    const show = () => {
        const el = hostRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setAnchor({ top: rect.bottom + 8, left: rect.left });
    };

    const hide = () => setAnchor(null);

    useLayoutEffect(() => {
        if (!anchor || !tipRef.current) return;
        const tip = tipRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const top = tip.bottom > vh - 8 ? Math.max(8, anchor.top - tip.height - 16) : anchor.top;
        const left = Math.min(anchor.left, Math.max(8, vw - tip.width - 8));
        if (top !== anchor.top || left !== anchor.left) {
            setAnchor({ top, left });
        }
    }, [anchor]);

    useEffect(() => {
        if (!anchor) return;
        const hideOnScroll = () => setAnchor(null);
        window.addEventListener('scroll', hideOnScroll, true);
        window.addEventListener('resize', hideOnScroll, true);
        return () => {
            window.removeEventListener('scroll', hideOnScroll, true);
            window.removeEventListener('resize', hideOnScroll, true);
        };
    }, [anchor]);

    return (
        <span
            ref={hostRef}
            className={`name-tip ${className}`}
            onMouseEnter={show}
            onMouseLeave={hide}
            onFocus={show}
            onBlur={hide}
        >
            {children}
            {anchor &&
                createPortal(
                    <div
                        ref={tipRef}
                        className="name-tip-popover"
                        role="tooltip"
                        style={{ top: anchor.top, left: anchor.left }}
                    >
                        {value}
                    </div>,
                    document.body
                )}
        </span>
    );
}
