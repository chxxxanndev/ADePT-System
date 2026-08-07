import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, ReactNode, RefObject } from 'react';

const GAP = 8;
const VIEWPORT_MARGIN = 8;

interface FloatingPopoverProps {
    open: boolean;
    /** The trigger element (button or its wrapper) the popover anchors to. */
    triggerRef: RefObject<HTMLElement | null>;
    /** Which edge of the trigger the popover aligns to. Defaults to 'right'. */
    align?: 'left' | 'right';
    className?: string;
    style?: CSSProperties;
    /** Called on outside click or Escape. */
    onClose?: () => void;
    children: ReactNode;
}

interface PopoverRect {
    top: number;
    left: number;
    maxHeight?: number;
}

/**
 * Renders the popover in a portal on <body> so it can never be clipped by
 * `overflow: hidden/auto/scroll` on intermediate containers (cards, table
 * scroll wrappers, sticky headers) or trapped inside their stacking
 * contexts. Position is `fixed` and computed from the trigger's live
 * bounding rect: the popover opens directly below the trigger aligned to
 * its left/right edge, flips upward when there is not enough room below,
 * clamps horizontally inside the viewport, and falls back to an internal
 * scroll when the viewport is too short to fit it at all.
 */
export function FloatingPopover({
    open,
    triggerRef,
    align = 'right',
    className,
    style,
    onClose,
    children,
}: FloatingPopoverProps) {
    const [rect, setRect] = useState<PopoverRect | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    const update = useCallback(() => {
        const trigger = triggerRef.current;
        const popover = popoverRef.current;
        if (!trigger || !popover) return;

        const tr = trigger.getBoundingClientRect();
        const pr = popover.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const width = pr.width || 300;
        const height = pr.height || 320;

        let left = align === 'right' ? tr.right - width : tr.left;
        left = Math.min(Math.max(left, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, vw - width - VIEWPORT_MARGIN));

        const spaceBelow = vh - tr.bottom - GAP - VIEWPORT_MARGIN;
        const spaceAbove = tr.top - GAP - VIEWPORT_MARGIN;

        let top: number;
        let maxHeight: number | undefined;
        if (spaceBelow >= height) {
            top = tr.bottom + GAP;
        } else if (spaceAbove >= height) {
            top = tr.top - GAP - height;
        } else {
            // Neither side fits: open downward and scroll internally.
            top = Math.max(VIEWPORT_MARGIN, tr.bottom + GAP);
            maxHeight = Math.max(VIEWPORT_MARGIN, vh - top - VIEWPORT_MARGIN);
        }

        setRect({ top, left, maxHeight });
    }, [triggerRef, align]);

    // Position before paint so there is no visible "wrong position" frame.
    useLayoutEffect(() => {
        if (open) update();
        else setRect(null);
    }, [open, update]);

    // Reposition while open: the page may scroll or resize underneath a
    // fixed-position portal element.
    useEffect(() => {
        if (!open) return;
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [open, update]);

    // Reposition when the popover itself changes size (e.g. the date-range
    // popover expanding from the preset list into the two-pane calendar).
    useEffect(() => {
        if (!open || !popoverRef.current) return;
        const observer = new ResizeObserver(update);
        observer.observe(popoverRef.current);
        return () => observer.disconnect();
    }, [open, update]);

    useEffect(() => {
        if (!open) return;
        function handlePointerDown(e: MouseEvent) {
            const target = e.target as Node;
            if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
            onClose?.();
        }
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose?.();
        }
        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, onClose, triggerRef]);

    if (!open) return null;

    return createPortal(
        <div
            ref={popoverRef}
            className={className}
            style={{
                position: 'fixed',
                top: rect?.top,
                left: rect?.left,
                right: 'auto',
                bottom: 'auto',
                maxHeight: rect?.maxHeight,
                overflowY: rect?.maxHeight ? 'auto' : undefined,
                ...style,
            }}
        >
            {children}
        </div>,
        document.body
    );
}
