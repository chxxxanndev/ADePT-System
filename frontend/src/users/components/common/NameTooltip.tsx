import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import "../../styles/NameTip.css";

interface NameTooltipProps {
    /** Full value shown in the tooltip on hover. */
    value: string;
    /** The visible text/children that act as the hover target. */
    children: React.ReactNode;
    /** Optional class applied to the hover target (e.g. "expandable-text-label"). */
    className?: string;
}

/**
 * Hover tooltip for name/declarant cells. Rendered through a portal with
 * fixed positioning so table containers with overflow: hidden/auto (cards,
 * scroll wrappers, cells) can never clip it — unlike CSS-only ::after
 * tooltips, which silently vanish inside any clipped table (the root cause
 * of the Transaction Registry's broken name hover).
 *
 * The tooltip is a wide rectangle (width-oriented) using the ADePT indigo
 * surface + readable white text, with pointer-events: none so it never
 * interferes with the hover target or causes flicker. It hides while the
 * page scrolls (a fixed tooltip would otherwise drift away from the name).
 */
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

    // Keep the tooltip fully inside the viewport — flip it above the name
    // when it would overflow the bottom edge, clamp it against the right
    // edge. Re-measuring converges (no loop) because once the values match
    // the anchor, the state is left untouched.
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

    // A fixed-position tooltip drifts away from the name while the page or
    // table scrolls — hide it on any scroll/resize instead of chasing it.
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
