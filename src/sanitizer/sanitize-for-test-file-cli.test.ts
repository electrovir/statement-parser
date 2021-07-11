import {existsSync, unlink} from 'fs-extra';
import {resolveTestGroup, testGroup} from 'test-vir';
import {ParserType} from '../parser/all-parsers';
import {dummyPdfPath} from '../repo-paths';
import {CliErrors, sanitizeForTestFileCli} from './sanitize-for-test-file-cli';
import {createSanitizedTestInput} from './sanitized-test';

function testTempOutputFile(args: string[]) {
    return async () => {
        const {sanitizedTestFilePath: filePath} = await sanitizeForTestFileCli(args, false);

        const testInput = createSanitizedTestInput(filePath);

        const testGroupOutput = testGroup({
            description: `inner test for ${filePath}`,
            tests: (runTest) => {
                runTest(testInput);
            },
        });

        await resolveTestGroup(testGroupOutput);

        // if the output file was created, delete it
        if (existsSync(filePath)) {
            await unlink(filePath);
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
        description: 'tests dummy pdf file',
        expectError: {
            errorMessage:
                /Failed to parse the original PDF before trying to sanitize it: Error: Reached end of input before hitting end state on "sample-files\/dummy\.pdf.+/,
        },
        test: testTempOutputFile([ParserType.Paypal, dummyPdfPath, 'temp/dummy-output-file.json']),
    });
});
