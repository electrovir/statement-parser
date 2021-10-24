import {existsSync} from 'fs-extra';
import {readPdfText} from 'pdf-text-reader';
import {getDocument, VerbosityLevel} from 'pdfjs-dist/legacy/build/pdf';
import {DocumentInitParameters, PDFDocumentProxy} from 'pdfjs-dist/types/src/display/api';

export async function readPdf(path: string): Promise<string[][]> {
    checkThatPdfExists(path);
    return (await readPdfText(createSource(path))).map((page) => page.lines);
}

export async function getPdfDocument(path: string): Promise<PDFDocumentProxy> {
    checkThatPdfExists(path);
    return await getDocument(createSource(path)).promise;
}

function createSource(path: string): DocumentInitParameters {
    return {url: path, verbosity: VerbosityLevel.ERRORS};
}

export function checkThatPdfExists(filePath: string): void {
    if (!existsSync(filePath)) {
        throw new Error(`PDF file "${filePath}" does not exist`);
    }
}
