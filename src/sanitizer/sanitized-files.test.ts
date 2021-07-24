import {join} from 'path';
import {testGroup} from 'test-vir';
import {getAllRecursiveFiles, sanitizedFilesDir} from '../repo-paths';
import {createSanitizedTestInput} from './sanitized-test';

async function getAllSanitizedFiles(): Promise<string[]> {
    return Array.from(await getAllRecursiveFiles(sanitizedFilesDir)).map((subPath) =>
        join(sanitizedFilesDir, subPath),
    );
}

testGroup({
    description: 'run all sanitized file tests',
    tests: async (runTest) => {
        (await getAllSanitizedFiles()).forEach((filePath) => {
            runTest(createSanitizedTestInput(filePath));
        });
    },
});
