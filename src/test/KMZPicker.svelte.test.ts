import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import JSZip from 'jszip';
import KMZPicker from '../lib/KMZPicker.svelte';
import { kmz } from '../lib/state.svelte';

// load a KMZ from public/test_data/ folder
async function loadTestKMZ(path: string, name = 'HYSPLIT_22130.kmz'): Promise<File> {
    const res = await fetch(path);
    const buf = await res.arrayBuffer();
    return new File([buf], name, { type: 'application/vnd.google-earth.kmz' });
}

// create ZIP file in-memory with specified files for testing KMZ loading
async function buildZipFile(files: Record<string, string>, name = 'HYSPLIT_22130.kmz'): Promise<File> {
  const zip = new JSZip();
  for (const [filename, content] of Object.entries(files)) {
    zip.file(filename, content);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], name, { type: 'application/vnd.google-earth.kmz' });
}

function resetKMZState() {
  Object.assign(kmz, { fullDom: null, dom: null, images: null });
}

const SIMPLE_KMZ = '/test_data/HYSPLIT_simple.kmz';
const MULTI_LEVEL_KMZ = '/test_data/HYSPLIT_extreme_3.kmz';

// strip image files from a KMZ, returning a new File with only the KML
async function stripImages(file: File, name: string): Promise<File> {
    const originalZip = await JSZip.loadAsync(await file.arrayBuffer());
    const strippedZip = new JSZip();
    for (const [filename, zipEntry] of Object.entries(originalZip.files)) {
        const isImage = /\.(png|jpg|jpeg|gif|bmp|tiff|gif)$/i.test(filename);
        if (!zipEntry.dir && !isImage) {
            strippedZip.file(filename, await zipEntry.async('arraybuffer'));
        }
    }
    const blob = await strippedZip.generateAsync({ type: 'blob' });
    return new File([blob], name, { type: 'application/vnd.google-earth.kmz' });
}

describe('KMZPicker - US-01: KMZ File Upload (component)', () => {
    beforeEach(resetKMZState);

    it('renders a "Choose File" button on initial load', async () => {
        render(KMZPicker);
        await expect.element(page.getByText('Choose File')).toBeInTheDocument();
    });

    it('shows "No file chosen" as the default filename label', async () => {
        render(KMZPicker);
        await expect.element(page.getByText('No file chosen')).toBeInTheDocument();
    });

    it('file input restricts selection to .kmz files', async () => {
        render(KMZPicker);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        expect(fileInput).toBeTruthy();
        expect(fileInput.accept).toBe('.kmz');
    });

    it('button label changes to "Replace file" after a file is chosen', async () => {
        render(KMZPicker);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = await loadTestKMZ(SIMPLE_KMZ);
        await userEvent.upload(fileInput, file);
        await expect.element(page.getByText('Replace file')).toBeInTheDocument();
    });

    it('displays the uploaded filename after a successful upload', async () => {
        render(KMZPicker);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = await loadTestKMZ(SIMPLE_KMZ, 'mydata.kmz');
        await userEvent.upload(fileInput, file);
        await expect.element(page.getByText('mydata.kmz')).toBeInTheDocument();
    });

    it('updates global kmz.dom and kmz.images after a successful upload', async () => {
        render(KMZPicker);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = await loadTestKMZ(SIMPLE_KMZ);
        await userEvent.upload(fileInput, file);
        await vi.waitFor(() => {
            expect(kmz.dom).not.toBeNull();
            expect(kmz.images).not.toBeNull();
        }, { timeout: 5000 });
    });

    it('completes the full upload pipeline within 5 seconds', async () => {
        render(KMZPicker);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = await loadTestKMZ(SIMPLE_KMZ);
        const start = Date.now();
        await userEvent.upload(fileInput, file);
        await vi.waitFor(() => expect(kmz.dom).not.toBeNull(), { timeout: 5000 });
        expect(Date.now() - start).toBeLessThan(5000);
    });

    it('does not show a dropdown when the KMZ contains only one level', async () => {
        render(KMZPicker);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = await loadTestKMZ(SIMPLE_KMZ);
        await userEvent.upload(fileInput, file);
        await vi.waitFor(() => expect(kmz.dom).not.toBeNull(), { timeout: 5000 });
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(document.querySelector('select')).toBeNull();
    });

    it('displays a dropdown when the KMZ file has multiple levels', async () => {
        render(KMZPicker);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const multiLevelKMZ = await loadTestKMZ(MULTI_LEVEL_KMZ, 'multi_level.kmz');
        await userEvent.upload(fileInput, multiLevelKMZ);

        await vi.waitFor(() => {
            expect(kmz.dom).not.toBeNull();
            expect(kmz.fullDom).not.toBeNull();
        }, { timeout: 5000 });

        await vi.waitFor(() => {
            const dropdown = document.querySelector('select');
            expect(dropdown).not.toBeNull();
        }, { timeout: 2000 });
    });

    it('changing the dropdown selection updates kmz.dom to the selected level', async () => {
        render(KMZPicker);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const multiLevelKMZ = await loadTestKMZ(MULTI_LEVEL_KMZ, 'multi_level.kmz');
        await userEvent.upload(fileInput, multiLevelKMZ);

        await vi.waitFor(() => {
            expect(kmz.dom).not.toBeNull();
        }, { timeout: 5000 });

        await vi.waitFor(() => {
            expect(document.querySelector('select')).not.toBeNull();
        }, { timeout: 2000 });

        const domBefore = kmz.dom;
        const select = document.querySelector('select') as HTMLSelectElement;

        await userEvent.selectOptions(select, '1');

        await vi.waitFor(() => {
            expect(kmz.dom).not.toBe(domBefore);
        }, { timeout: 2000 });
    });

    it('setActiveLevel does nothing when index is out of bounds', async () => {
        render(KMZPicker);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const multiLevelKMZ = await loadTestKMZ(MULTI_LEVEL_KMZ, 'multi_level.kmz');
        await userEvent.upload(fileInput, multiLevelKMZ);

        await vi.waitFor(() => {
            expect(kmz.dom).not.toBeNull();
        }, { timeout: 5000 });

        const domBefore = kmz.dom;

        const select = document.querySelector('select') as HTMLSelectElement;
        select.value = '999';
        select.dispatchEvent(new Event('change'));

        await new Promise(resolve => setTimeout(resolve, 100));
        expect(kmz.dom).toBe(domBefore);
    });

    it('shows a warning but still sets kmz state when KMZ has no images', async () => {
        render(KMZPicker);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

        const kmzWithoutImages = await stripImages(
            await loadTestKMZ(SIMPLE_KMZ), 'no_images.kmz'
        );
        await userEvent.upload(fileInput, kmzWithoutImages);

        await vi.waitFor(() => {
            expect(kmz.dom).not.toBeNull();
        }, { timeout: 5000 });

        expect(document.getElementById('error-container')?.textContent?.trim()).toContain('Warning');
        expect(kmz.fullDom).not.toBeNull();
        expect(kmz.images).not.toBeNull();
    });
});

describe('KMZPicker - US-02: File Validation (component)', () => {
    beforeEach(resetKMZState);

    it('shows an error message when a plain-text file is uploaded', async () => {
        render(KMZPicker);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        await userEvent.upload(fileInput, new File(['not a zip at all'], 'bad.kmz'));
        await vi.waitFor(() => {
            const errorContainer = document.getElementById('error-container');
            expect(errorContainer).not.toBeNull();
            expect(errorContainer?.textContent?.trim()).not.toBe('');
        }, { timeout: 2000 });
    });

    it('shows an error message for an empty file', async () => {
        render(KMZPicker);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        await userEvent.upload(fileInput, new File([], 'empty.kmz'));
        await vi.waitFor(() => {
            expect(document.getElementById('error-container')?.textContent?.trim()).not.toBe('');
        });
    });

    it('shows an error message for a ZIP that contains no KML file', async () => {
        render(KMZPicker);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const noKml = await buildZipFile({ 'readme.txt': 'no kml here' }, 'nokml.kmz');
        await userEvent.upload(fileInput, noKml);
        await vi.waitFor(() => {
            expect(document.getElementById('error-container')?.textContent?.trim()).not.toBe('');
        });
    });

    it('shows an error message for a file with corrupted bytes', async () => {
        render(KMZPicker);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const corrupt = new File([new Uint8Array([0x00, 0x11, 0xFF, 0xFE])], 'corrupt.kmz');
        await userEvent.upload(fileInput, corrupt);
        await vi.waitFor(() => {
            expect(document.getElementById('error-container')?.textContent?.trim()).not.toBe('');
        });
    });

    it('shows an error for a ZIP with invalid KML (parsererror)', async () => {
        render(KMZPicker);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const badKml = await buildZipFile({ 'doc.kml': '<unclosed>' }, 'bad_kml.kmz');
        await userEvent.upload(fileInput, badKml);
        await vi.waitFor(() => {
            expect(document.getElementById('error-container')?.textContent?.trim()).not.toBe('');
        }, { timeout: 2000 });
    });

    it('shows an error when a valid KML has no atmosphere level folders', async () => {
        render(KMZPicker);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const noLevels = await buildZipFile({
            'doc.kml': `<?xml version="1.0" encoding="UTF-8"?>
            <kml xmlns="http://www.opengis.net/kml/2.2">
            <Document><name>No Levels</name></Document>
            </kml>`
        }, 'no_levels.kmz');
        await userEvent.upload(fileInput, noLevels);
        await vi.waitFor(() => {
            expect(document.getElementById('error-container')?.textContent?.trim())
                .toContain('No atmosphere level folders');
        }, { timeout: 2000 });
    });

    it('does not update KMZ state when an invalid file is uploaded', async () => {
        render(KMZPicker);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        await userEvent.upload(fileInput, new File(['garbage data'], 'bad.kmz'));
        await vi.waitFor(() => {
            expect(document.getElementById('error-container')?.textContent?.trim()).not.toBe('');
        });
        expect(kmz.dom).toBeNull();
        expect(kmz.fullDom).toBeNull();
    });

    it('clears a previous error when a valid file is subsequently uploaded', async () => {
        render(KMZPicker);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

        await userEvent.upload(fileInput, new File(['bad'], 'bad.kmz'));
        await vi.waitFor(() => {
            expect(document.getElementById('error-container')?.textContent?.trim()).not.toBe('');
        });

        await userEvent.upload(fileInput, await loadTestKMZ(SIMPLE_KMZ));
        await vi.waitFor(() =>
            expect(document.getElementById('error-container')?.textContent?.trim()).toBe(''),
            { timeout: 5000 }
        );
    });
});