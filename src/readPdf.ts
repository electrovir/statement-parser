import {existsSync} from 'fs';
import {readPdfText} from 'pdf-text-reader';
import {getDocument, VerbosityLevel} from 'pdfjs-dist/es5/build/pdf';
import {PDFDocumentProxy} from 'pdfjs-dist/types/display/api';

export async function readPdf(path: string): Promise<string[][]> {
    if (!existsSync(path)) {
        throw new Error(`File "${path}" does not exist`);
    }
    return (await readPdfText(createSource(path))).map((page) => page.lines);
}

export async function getPdfDocument(path: string): Promise<PDFDocumentProxy> {
    return await getDocument(createSource(path)).promise;
}

function createSource(path: string) {
    return {url: path, verbosity: VerbosityLevel.ERRORS};
}
