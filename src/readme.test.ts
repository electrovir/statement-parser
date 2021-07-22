import {readFile} from 'fs-extra';
import {join} from 'path';
import {testGroup} from 'test-vir';
import {getPackageVersion} from './package-version';
import {repoRootDir} from './repo-paths';

testGroup({
    description: `readme tests`,
    tests: (runTest) => {
        async function readFirstLineOfReadme() {
            const readmePath = join(repoRootDir, 'README.md');

            const allReadmeText: string[] = (await readFile(readmePath)).toString().split('\n');

            if (!allReadmeText.length) {
                throw new Error(`${readmePath} file is empty.`);
            }

            const firstLine = allReadmeText[0];

            if (!firstLine) {
                throw new Error(`First line of readme is empty.`);
            }

            return firstLine;
        }

        runTest({
            expect: true,
            description: 'check that package version can be read',
            test: () => {
                return !!getPackageVersion().length;
            },
        });

        runTest({
            description: 'verify assumptions about first README line',
            expect: '# Statement Parser v',
            test: async () => {
                const firstLine = await readFirstLineOfReadme();

                return firstLine.replace(/v\d\.\d\.\d/, 'v');
            },
        });

        runTest({
            /**
             * If this fails it indicates that we need to update the README.md file, likely more
             * than just updating the version number.
             */
            description: 'check that README version number is up to date',
            expect: getPackageVersion(),
            test: async () => {
                const firstLine = await readFirstLineOfReadme();

                const readmeVersion = firstLine.trim().replace(/.*statement\s+parser.*?v/i, '');

                return readmeVersion;
            },
        });
    },
});
