import {join} from 'path';
import {testGroup, TestInputObject} from 'test-vir';
import {tempOutputDir} from '../repo-paths';
import {generatePdfDocument} from './generate-pdf';
import {checkThatPdfExists, readPdf} from './read-pdf';

let testCounter = 0;

function generateGeneratePdfTest(
    description: string,
    inputText: string[],
    expect?: string[],
): TestInputObject<string[] | undefined, undefined> {
    return {
        description,
        expect: expect ?? inputText,
        test: async () => {
            const outputFilePath = join(
                tempOutputDir,
                `generate-pdf-text-output-${testCounter++}.pdf`,
            );

            await generatePdfDocument(inputText, outputFilePath);

            checkThatPdfExists(outputFilePath);

            const writtenText = (await readPdf(outputFilePath))[0];

            return writtenText;
        },
    };
}

testGroup({
    description: generatePdfDocument.name,
    tests: (runTest) => {
        runTest(generateGeneratePdfTest('simple text', ['hello there']));
        runTest(
            generateGeneratePdfTest('multiple lines of text', [
                'hello there',
                'you are a bold one',
                'you are doomed',
                'oh I do not think so',
                'indeed',
            ]),
        );
        runTest(
            generateGeneratePdfTest(
                'long line of text',
                [
                    'hello there you are a bold one you are doomed oh I do not think so indeed so uncivilized',
                ],
                [
                    'hello there you are a bold one you are ',
                    'doomed oh I do not think so indeed so ',
                    'uncivilized',
                ],
            ),
        );
    },
});
