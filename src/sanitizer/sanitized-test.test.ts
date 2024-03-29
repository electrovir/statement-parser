import {getEnumTypedValues} from 'augment-vir';
import {unlinkSync} from 'fs-extra';
import {join} from 'path';
import {testGroup} from 'test-vir';
import {ParserType} from '../parser/all-parsers';
import {sampleFilesDir} from '../repo-paths';
import {writeSanitizedTestFile} from './sanitized-test';

testGroup({
    description: writeSanitizedTestFile.name,
    tests: (runTest) => {
        const missingFileName = 'missingFi';

        getEnumTypedValues(ParserType).forEach((singleParserType) => {
            runTest({
                expectError: {
                    errorMessage: `PDF file "${missingFileName}" does not exist`,
                },
                description: `fails on missing file for ${singleParserType}`,
                test: async () => {
                    const fakeOutputFile = 'please-no-write-here.txt';
                    await writeSanitizedTestFile(
                        {
                            parserInput: {filePath: missingFileName},
                            type: singleParserType,
                        },
                        fakeOutputFile,
                    );
                    // just in case the file actually gets written
                    unlinkSync(join(sampleFilesDir, fakeOutputFile));
                },
            });
        });
    },
});
