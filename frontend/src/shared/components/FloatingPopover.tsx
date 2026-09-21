import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, ReactNode, RefObject } from 'react';

const GAP = 8;
const VIEWPORT_MARGIN = 8;

interface FloatingPopoverProps {
    open: boolean;
    triggerRef: RefObject<HTMLElement | null>;
    align?: 'left' | 'right';
    className?: string;
    style?: CSSProperties;
    onClose?: () => void;
    children: ReactNode;
}

interface PopoverRect {
    top: number;
    left: number;
    maxHeight?: number;
}

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
            top = Math.max(VIEWPORT_MARGIN, tr.bottom + GAP);
            maxHeight = Math.max(VIEWPORT_MARGIN, vh - top - VIEWPORT_MARGIN);
        }

        setRect({ top, left, maxHeight });
    }, [triggerRef, align]);

    useLayoutEffect(() => {
        if (open) update();
        else setRect(null);
    }, [open, update]);

    useEffect(() => {
        if (!open) return;
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [open, update]);

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
