import {createWriteStream} from 'fs-extra';
import PDFDocument from 'pdfkit';

export async function generatePdfDocument(
    inputText: string[] | string,
    outputFilePath: string,
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const pdf = new PDFDocument();

        if (Array.isArray(inputText)) {
            inputText = inputText.join('\n');
        }

        const outputStream = createWriteStream(outputFilePath);

        pdf.pipe(outputStream);

        pdf.fontSize(25).text(inputText, 100, 100);

        pdf.end();

        outputStream.addListener('close', () => {
            resolve();
        });
        outputStream.addListener('error', () => {
            reject();
        });
    });
}
