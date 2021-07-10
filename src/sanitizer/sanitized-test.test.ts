import {unlinkSync} from 'fs-extra';
import {join} from 'path';
import {testGroup} from 'test-vir';
import {getEnumTypedValues} from '../augments/object';
import {ParserType} from '../parser/all-parsers';
import {sampleFileDir} from '../repo-paths';
import {writeSanitizedTestFile} from './sanitized-test';

testGroup({
    description: writeSanitizedTestFile.name,
    tests: (runTest) => {
        const missingFileName = 'missingFi';

        getEnumTypedValues(ParserType).forEach((singleParserType) => {
            runTest({
                expectError: {
                    errorMessage: `File "${missingFileName}" does not exist`,
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
                    unlinkSync(join(sampleFileDir, fakeOutputFile));
                },
            });
        });
    },
});
