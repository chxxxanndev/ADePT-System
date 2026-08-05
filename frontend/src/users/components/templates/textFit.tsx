import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Text auto-fit helpers for @react-pdf/renderer templates.
//
// react-pdf has no built-in "shrink-to-fit": long text just wraps, which grows
// a fixed-height underline box and pushes the rest of an official form down.
// These helpers measure text against the browser's canvas (1pt = 96/72 CSS px)
// and binary-search the largest font size that still fits the available width
// on one line (or the available line count for free-wrapping fields), so the
// data shrinks while the form geometry never moves.
// ---------------------------------------------------------------------------

const PT_TO_PX = 96 / 72;

// The same font files the templates register with react-pdf, loaded into the
// browser's FontFace set so canvas.measureText() can measure the real glyphs.
const FONT_SOURCES: Record<string, Array<{ weight: string; style: string; src: string }>> = {
    BookmanOldStyle: [
        { weight: 'normal', style: 'normal', src: '/fonts/bookos.ttf' },
        { weight: 'bold', style: 'normal', src: '/fonts/bookosb.ttf' },
        { weight: 'normal', style: 'italic', src: '/fonts/bookosi.ttf' },
        { weight: 'bold', style: 'italic', src: '/fonts/bookosbi.ttf' },
    ],
};

// react-pdf's built-in Times family maps to the browser's Times New Roman for
// measurement (metrically near-identical); the two registered families map
// straight to their FontFace names.
const CSS_FAMILY: Record<string, string> = {
    'Times-Roman': '"Times New Roman", "Liberation Serif", serif',
    'Times-Bold': '"Times New Roman", "Liberation Serif", serif',
    BookmanOldStyle: 'BookmanOldStyle, serif',
    Castellar: 'Castellar, serif',
};

let fontsPromise: Promise<void> | null = null;

export function ensureMeasureFonts(): Promise<void> {
    if (typeof document === 'undefined') return Promise.resolve();
    if (fontsPromise) return fontsPromise;

    fontsPromise = (async () => {
        const origin = window.location.origin;
        const faces: FontFace[] = [];
        for (const [family, variants] of Object.entries(FONT_SOURCES)) {
            for (const v of variants) {
                try {
                    const face = new FontFace(family, `url(${origin}${v.src})`, {
                        weight: v.weight,
                        style: v.style,
                    });
                    faces.push(face);
                    document.fonts.add(face);
                } catch {
                    // ignore malformed faces — measurement falls back to an estimate
                }
            }
        }
        await Promise.allSettled(faces.map((f) => f.load()));
        await document.fonts.ready;
    })();

    return fontsPromise;
}

let canvas: HTMLCanvasElement | null = null;
let canvasCtx: CanvasRenderingContext2D | null = null;

const getCtx = (): CanvasRenderingContext2D | null => {
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvasCtx = canvas.getContext('2d');
    }
    return canvasCtx;
};

const normalizeWeight = (weight: string | number): string =>
    weight === 'bold' || weight === 700 ? 'bold' : 'normal';

// Rough fallback used before the real fonts are ready (or if canvas/FF is
// unavailable). BookmanOldStyle is noticeably wider than a generic serif, so
// this deliberately over-estimates to err on the safe side.
export const estimateWidth = (text: string, sizePt: number): number => text.length * sizePt * 0.62;

/**
 * Width of `text` in PDF points at the given size/weight/style.
 */
export function measureTextWidth(
    text: string,
    family: string,
    sizePt: number,
    weight: string | number = 'normal',
    style: string = 'normal',
): number {
    if (!text) return 0;
    const ctx = getCtx();
    if (!ctx) return estimateWidth(text, sizePt);

    const cssFamily = CSS_FAMILY[family] || family;
    const italic = style === 'italic' ? 'italic ' : '';
    const bold = normalizeWeight(weight) === 'bold' ? 'bold ' : '';
    ctx.font = `${italic}${bold}${sizePt * PT_TO_PX}px ${cssFamily}`;
    return ctx.measureText(text).width / PT_TO_PX;
}

export interface FitToWidthOptions {
    base: number;       // preferred size — returned when the text already fits
    min: number;        // preferred floor — the smallest size to use when the text fits at it
    absMin?: number;    // hard floor — if the text can't fit at `min`, keep shrinking down to this
    weight?: string | number;
    style?: string;
    safety?: number;    // pt subtracted from maxWidth (flex/rounding slack)
}

/**
 * Largest font size ≤ `base` that keeps `text` on one line within maxWidthPt.
 * Returns `base` when the text already fits. When it doesn't fit at `min`, the
 * search keeps going down to `absMin` (graceful degradation) so a very long
 * value still fits on one line instead of wrapping and growing its box.
 */
export function fitFontSizeToWidth(
    text: string,
    maxWidthPt: number,
    family: string,
    opts: FitToWidthOptions,
): number {
    const { base, min, absMin, weight = 'normal', style = 'normal', safety = 2 } = opts;
    // Guard: never honour a base below the caller's own floor — a base like
    // 1pt would render invisible text instead of fitting (min is the smallest
    // size the layout is willing to show).
    const effBase = Math.max(base, min);
    if (!text) return effBase;

    const available = Math.max(min, maxWidthPt - safety);
    if (measureTextWidth(text, family, effBase, weight, style) <= available) return effBase;

    const floor = absMin !== undefined ? absMin : min;
    let lo = floor;
    let hi = effBase;
    for (let i = 0; i < 10; i++) {
        const mid = (lo + hi) / 2;
        if (measureTextWidth(text, family, mid, weight, style) <= available) {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    return Math.max(floor, lo);
}

export interface FitToLinesOptions {
    base: number;
    min: number;
    absMin?: number;    // hard floor — keep shrinking below `min` if text still exceeds maxLines
    weight?: string | number;
    style?: string;
}

/**
 * Largest font size ≤ `base` that keeps `text` wrapped within `maxLines` lines
 * inside maxWidthPt (used by free-wrapping fields like the Memoranda block).
 */
export function fitFontSizeToLines(
    text: string,
    maxWidthPt: number,
    maxLines: number,
    family: string,
    opts: FitToLinesOptions,
): number {
    const { base, min, absMin, weight = 'normal', style = 'normal' } = opts;
    // Guard: never honour a base below the caller's own floor (see above).
    const effBase = Math.max(base, min);
    if (!text) return effBase;

    const available = Math.max(1, maxWidthPt - 2);
    const countLines = (size: number): number => {
        const words = text.split(/\s+/).filter(Boolean);
        if (words.length === 0) return 1;
        let lines = 0;
        let current = '';
        for (const word of words) {
            const test = current ? `${current} ${word}` : word;
            if (measureTextWidth(test, family, size, weight, style) <= available) {
                current = test;
            } else {
                lines++;
                current = word;
            }
        }
        if (current) lines++;
        return lines;
    };

    if (countLines(effBase) <= maxLines) return effBase;

    const floor = absMin !== undefined ? absMin : min;
    let lo = floor;
    let hi = effBase;
    for (let i = 0; i < 10; i++) {
        const mid = (lo + hi) / 2;
        if (countLines(mid) <= maxLines) {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    return Math.max(floor, lo);
}

/**
 * Re-render flag: stays false until the measure fonts are loaded, so templates
 * can fall back to base sizes on the first pass and snap to fitted sizes once
 * the real metrics are available.
 */
export function useTextMeasureReady(): boolean {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        ensureMeasureFonts().then(() => {
            if (!cancelled) setReady(true);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return ready;
}
