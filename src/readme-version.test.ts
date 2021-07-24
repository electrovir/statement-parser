import {readFile} from 'fs-extra';
import {join} from 'path';
import {testGroup} from 'test-vir';
import {getPackageVersion} from './package-version';
import {repoRootDir} from './repo-paths';

testGroup({
    description: `readme tests`,
    tests: (runTest) => {
        async function readVersionLineOfReadme() {
            const readmePath = join(repoRootDir, 'README.md');

            const allReadmeText: string[] = (await readFile(readmePath)).toString().split('\n');

            if (!allReadmeText.length) {
                throw new Error(`${readmePath} file is empty.`);
            }

            const versionLine = allReadmeText[allReadmeText.length - 2];

            if (!versionLine) {
                throw new Error(`version line of README is empty.`);
            }

            return versionLine;
        }

        runTest({
            expect: true,
            description: 'check that package version can be read',
            test: () => {
                return !!getPackageVersion().length;
            },
        });

        runTest({
            description: 'verify that version line of README is read',
            expect: true,
            test: async () => {
                const firstLine = await readVersionLineOfReadme();

                return firstLine.match(/v\d+\.\d+\.\d+/) !== null;
            },
        });

        runTest({
            /**
             * If this fails it indicates that we need to update the README.md file. This will
             * likely require updating the documentation itself (to match the new version's
             * changes), not just incrementing the number.
             */
            description: 'check that README version number is up to date',
            expect: getPackageVersion(),
            test: async () => {
                const firstLine = await readVersionLineOfReadme();

                const readmeVersion = firstLine.trim().replace(/^.*v/i, '');

                return readmeVersion;
            },
        });
    },
});
