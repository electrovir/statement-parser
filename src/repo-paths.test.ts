import {join} from 'path';
import {testGroup} from 'test-vir';
import {filesDir, getAllRecursiveFiles} from './repo-paths';

testGroup({
    description: getAllRecursiveFiles.name,
    tests: (runTest) => {
        runTest({
            description: 'should get all files',
            expect: new Set([
                join('example-sub-dir', 'example-sub-sub-dir', 'sub-sub-nothing'),
                join('example-sub-dir', 'sub-nothing'),
                join('example-sub-dir', 'sub-nothing-2'),
                join('example-sub-dir-2', 'sub-2-nothing'),
                'README.md',
                'top-nothing',
            ]),
            test: async () => {
                return await getAllRecursiveFiles(join(filesDir, 'example-dir'));
            },
        });
    },
});
