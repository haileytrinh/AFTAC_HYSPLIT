import { describe, expect, it, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ScreenOverlay from '../lib/ScreenOverlay.svelte';
import { kmz } from '../lib/state.svelte';

// build a ScreenOverlay XML element with configurable screenXY/overlayXY attributes
function buildOverlayElement({
    name = 'Test Overlay',
    href = 'test_image.png',
    screenXUnits = 'fraction',
    screenYUnits = 'fraction',
    screenX = '0.5',
    screenY = '0.5',
    overlayXUnits = 'fraction',
    overlayYUnits = 'fraction',
    overlayX = '0.5',
    overlayY = '0.5',
}: {
    name?: string;
    href?: string;
    screenXUnits?: string;
    screenYUnits?: string;
    screenX?: string;
    screenY?: string;
    overlayXUnits?: string;
    overlayYUnits?: string;
    overlayX?: string;
    overlayY?: string;
} = {}): Element {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`
        <ScreenOverlay>
        <name>${name}</name>
        <Icon><href>${href}</href></Icon>
        <screenXY x="${screenX}" y="${screenY}" xunits="${screenXUnits}" yunits="${screenYUnits}" />
        <overlayXY x="${overlayX}" y="${overlayY}" xunits="${overlayXUnits}" yunits="${overlayYUnits}" />
        </ScreenOverlay>
    `, 'application/xml');
    return doc.documentElement;
}

function resetKMZState() {
    Object.assign(kmz, { fullDom: null, dom: null, images: null });
}

describe('ScreenOverlay component', () => {
    beforeEach(resetKMZState);

    // image src
    it('renders an img with the blob URL when kmz.images contains the href key', () => {
        const blobUrl = 'blob:http://localhost/fake-blob-id';
        Object.assign(kmz, { images: { 'test_image.png': blobUrl } });

        const overlayElement = buildOverlayElement({ href: 'test_image.png' });
        render(ScreenOverlay, { overlayElement });

        const img = document.querySelector('img') as HTMLImageElement;
        expect(img).not.toBeNull();
        expect(img.src).toBe(blobUrl);
    });

    it('falls back to placehold.co when kmz.images is null', () => {
        const overlayElement = buildOverlayElement({ href: 'missing.png' });
        render(ScreenOverlay, { overlayElement });

        const img = document.querySelector('img') as HTMLImageElement;
        expect(img).not.toBeNull();
        expect(img.src).toContain('placehold.co');
    });

    it('renders with correct alt text from the name element', () => {
        const overlayElement = buildOverlayElement({ name: 'My Legend' });
        render(ScreenOverlay, { overlayElement });

        const img = document.querySelector('img') as HTMLImageElement;
        expect(img.alt).toBe('My Legend');
    });

    // screenXY x-axis branches
    it('positions left as pixels when screenXUnits is "pixels"', () => {
        const overlayElement = buildOverlayElement({ screenXUnits: 'pixels', screenX: '20' });
        render(ScreenOverlay, { overlayElement });

        const anchor = document.querySelector('.anchor') as HTMLElement;
        expect(anchor.style.left).toBe('20px');
    });
    it('positions right as insetPixels when screenXUnits is "insetPixels"', () => {
        const overlayElement = buildOverlayElement({ screenXUnits: 'insetPixels', screenX: '10' });
        render(ScreenOverlay, { overlayElement });

        const anchor = document.querySelector('.anchor') as HTMLElement;
        expect(anchor.style.right).toBe('10px');
    });
    it('positions left as percentage when screenXUnits is "fraction"', () => {
        const overlayElement = buildOverlayElement({ screenXUnits: 'fraction', screenX: '0.25' });
        render(ScreenOverlay, { overlayElement });

        const anchor = document.querySelector('.anchor') as HTMLElement;
        expect(anchor.style.left).toBe('25%');
    });

    // screenXY y-axis branche
    it('positions bottom as pixels when screenYUnits is "pixels"', () => {
        const overlayElement = buildOverlayElement({ screenYUnits: 'pixels', screenY: '15' });
        render(ScreenOverlay, { overlayElement });

        const anchor = document.querySelector('.anchor') as HTMLElement;
        expect(anchor.style.bottom).toBe('15px');
    });
    it('positions top as insetPixels when screenYUnits is "insetPixels"', () => {
        const overlayElement = buildOverlayElement({ screenYUnits: 'insetPixels', screenY: '5' });
        render(ScreenOverlay, { overlayElement });

        const anchor = document.querySelector('.anchor') as HTMLElement;
        expect(anchor.style.top).toBe('5px');
    });
    it('positions bottom as percentage when screenYUnits is "fraction"', () => {
        const overlayElement = buildOverlayElement({ screenYUnits: 'fraction', screenY: '0.1' });
        render(ScreenOverlay, { overlayElement });

        const anchor = document.querySelector('.anchor') as HTMLElement;
        expect(anchor.style.bottom).toBe('10%');
    });

    // overlayXY x-axis transform branches
    it('applies negative pixel tx when overlayXUnits is "pixels"', () => {
        const overlayElement = buildOverlayElement({ overlayXUnits: 'pixels', overlayX: '30' });
        render(ScreenOverlay, { overlayElement });

        const img = document.querySelector('img') as HTMLElement;
        expect(img.style.transform).toContain('-30px');
    });
    it('applies calc insetPixels tx when overlayXUnits is "insetPixels"', () => {
        const overlayElement = buildOverlayElement({ overlayXUnits: 'insetPixels', overlayX: '10' });
        render(ScreenOverlay, { overlayElement });

        const img = document.querySelector('img') as HTMLElement;
        expect(img.style.transform).toContain('calc(-100% + 10px)');
    });
    it('applies percentage tx when overlayXUnits is "fraction"', () => {
        const overlayElement = buildOverlayElement({ overlayXUnits: 'fraction', overlayX: '0.5' });
        render(ScreenOverlay, { overlayElement });

        const img = document.querySelector('img') as HTMLElement;
        expect(img.style.transform).toContain('-50%');
    });

    // overlayXY y-axis transform branches
    it('applies calc pixel ty when overlayYUnits is "pixels"', () => {
        const overlayElement = buildOverlayElement({ overlayYUnits: 'pixels', overlayY: '20' });
        render(ScreenOverlay, { overlayElement });

        const img = document.querySelector('img') as HTMLElement;
        expect(img.style.transform).toContain('calc(-100% + 20px)');
    });
    it('applies negative insetPixels ty when overlayYUnits is "insetPixels"', () => {
        const overlayElement = buildOverlayElement({ overlayYUnits: 'insetPixels', overlayY: '8' });
        render(ScreenOverlay, { overlayElement });

        const img = document.querySelector('img') as HTMLElement;
        expect(img.style.transform).toContain('-8px');
    });
    it('applies percentage ty when overlayYUnits is "fraction"', () => {
        // overlayY=0.25 → ty = -((1 - 0.25) * 100)% = -75%
        const overlayElement = buildOverlayElement({ overlayYUnits: 'fraction', overlayY: '0.25' });
        render(ScreenOverlay, { overlayElement });

        const img = document.querySelector('img') as HTMLElement;
        expect(img.style.transform).toContain('-75%');
    });
});