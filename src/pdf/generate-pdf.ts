import {createWriteStream, ensureDir} from 'fs-extra';
import {dirname} from 'path';
import PDFDocument from 'pdfkit';

export async function generatePdfDocument(
    inputText: string[] | string,
    outputFilePath: string,
    fontSize: number = 25,
): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
        const pdf = new PDFDocument();

        if (Array.isArray(inputText)) {
            inputText = inputText.join('\n');
        }

        await ensureDir(dirname(outputFilePath));

        const outputStream = createWriteStream(outputFilePath);

        pdf.pipe(outputStream);

        pdf.fontSize(fontSize).text(inputText, 100, 100);

        pdf.end();

        outputStream.addListener('close', () => {
            resolve(outputFilePath);
        });
        outputStream.addListener('error', (error) => {
            reject(error);
        });
    });
}
