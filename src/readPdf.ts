import {readPdfText} from 'pdf-text-reader';
import {VerbosityLevel, PDFDocumentProxy, getDocument, PDFWorker} from 'pdfjs-dist';
import {existsSync} from 'fs';

export async function readPdf(path: string): Promise<string[][]> {
    if (!existsSync(path)) {
        throw new Error(`File "${path}" does not exist`);
    }
    return (await readPdfText(createSource(path))).map(page => page.lines);
}

export async function getPdfDocument(path: string): Promise<PDFDocumentProxy> {
    return await getDocument(createSource(path)).promise;
}

function createSource(path: string) {
    return {url: path, verbosity: VerbosityLevel.ERRORS};
}
