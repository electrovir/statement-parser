import {existsSync, move} from 'fs-extra';
import {basename, join} from 'path';
import {resolveTestGroups, testGroup} from 'test-vir';
import {ParserType} from '../parser/all-parsers';
import {generatePdfDocument} from '../pdf/generate-pdf';
import {dummyPdfPath, tempOutputDir} from '../repo-paths';
import {CliErrors, sanitizeForTestFileCli} from './sanitize-for-test-file-cli';
import {createSanitizedTestInput} from './sanitized-test';

function testTempOutputFile(args: string[]) {
    return async () => {
        const output = await sanitizeForTestFileCli(args, false);
        if (typeof output === 'string') {
            throw new Error(`Sanitization CLI didn't produce proper output.`);
        }
        const {sanitizedTestFilePath: filePath} = output;

        const testInput = createSanitizedTestInput(filePath);

        const testGroupOutput = testGroup({
            description: `inner test for ${filePath}`,
            tests: (runTest) => {
                runTest(testInput);
            },
        });

        await resolveTestGroups(testGroupOutput);

        // if the output file was created, delete it
        if (existsSync(filePath)) {
            const movePath = join(tempOutputDir, basename(filePath));
            await move(filePath, movePath, {
                overwrite: true,
            });
        } else {
            throw new Error(`output file was not created: ${filePath}`);
        }
    };
}

testGroup((runTest) => {
    runTest({
        expectError: {
            errorMessage: CliErrors.MissingParserType,
        },
        description: 'api rejects missing parser type',
        test: testTempOutputFile([]),
    });
    runTest({
        expectError: {
            errorMessage: CliErrors.InvalidParserType('invalid'),
        },
        description: 'api rejects invalid parser type',
        test: testTempOutputFile(['invalid']),
    });
    runTest({
        expectError: {
            errorMessage: CliErrors.MissingPdfPath,
        },
        description: 'api rejects missing PDF file path',
        test: testTempOutputFile([ParserType.Paypal]),
    });
    runTest({
        expectError: {
            errorMessage: CliErrors.InvalidPdfPath('missing-file'),
        },
        description: 'api rejects invalid PDF file path',
        test: testTempOutputFile([ParserType.Paypal, 'missing-file']),
    });
    runTest({
        expectError: {
            errorMessage: `PDF file "missing-file.pdf" does not exist`,
        },
        description: 'api rejects PDF file path that is not on disk',
        test: testTempOutputFile([ParserType.Paypal, 'missing-file.pdf']),
    });
    runTest({
        expectError: {
            errorMessage: CliErrors.MissingOutputFileName,
        },
        description: 'api rejects missing output file name',
        test: testTempOutputFile([ParserType.Paypal, dummyPdfPath]),
    });
    runTest({
        expectError: {
            errorMessage: CliErrors.InvalidOutputFileName('output-file'),
        },
        description: 'api rejects invalid output file name',
        test: testTempOutputFile([ParserType.Paypal, dummyPdfPath, 'output-file']),
    });
    runTest({
        description: 'parse dummy pdf file',
        expectError: {
            errorMessage:
                /Failed to parse the original PDF before trying to sanitize it: Error: EndStateNotReachedError: Reached end of input before hitting end state\. .+/,
        },
        test: testTempOutputFile([ParserType.Paypal, dummyPdfPath, 'dummy-output-file.json']),
    });
    runTest({
        expectError: {
            errorMessage: CliErrors.InvalidDebugFlag('blahBlah'),
        },
        description: 'api rejects invalid debug flag',
        test: testTempOutputFile([
            ParserType.Paypal,
            dummyPdfPath,
            'dummy-output-file.json',
            'blahBlah',
        ]),
    });

    async function testDebug(debug: boolean) {
        async function generateSampleValidPdf() {
            return await generatePdfDocument(
                [
                    'statement closing date  4/5/6',
                    'Account Number  7 y z 8',
                    'Transactions',
                    'Payments and Credits',
                    'trans date post date',
                    'total payments and credits for this period $',
                    'fees',
                ],
                join(tempOutputDir, 'dummy-usaa-visa-credit.pdf'),
                12,
            );
        }

        const oldLog = console.log;
        const logs: any[] = [];
        console.log = function () {
            logs.push(arguments);
        };

        try {
            await testTempOutputFile([
                ParserType.UsaaVisaCredit,
                await generateSampleValidPdf(),
                'dummy-output-file.json',
                debug ? '--debug' : '',
            ])();
        } catch (error) {
            logs.forEach((args) => oldLog(...args));
            throw error;
        } finally {
            console.log = oldLog;
        }

        return logs;
    }

    runTest({
        description: 'does not print debug info when the debug flag is missing',
        expect: [],
        test: async () => {
            return await testDebug(false);
        },
    });

    runTest({
        description: 'prints debug info when the debug flag is used',
        expect: true,
        test: async () => {
            return (await testDebug(true)).length > 20;
        },
    });
});
