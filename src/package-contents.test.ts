import {testGroup} from 'test-vir';
import {runBashCommand} from './bash-scripting';

const packCommand = `npm pack --dry-run`;

const startTrigger = 'npm notice === Tarball Contents === ';
const endTrigger = 'npm notice === Tarball Details === ';

async function getRawPackFileList(): Promise<string[]> {
    const packOutput: string[] = (await runBashCommand(packCommand, true)).split('\n');

    const startTriggerIndex = packOutput.indexOf(startTrigger);
    const startIndex = startTriggerIndex > -1 ? startTriggerIndex : 0;
    const endTriggerIndex = packOutput.indexOf(endTrigger);
    const endIndex = endTriggerIndex > -1 ? endTriggerIndex : packOutput.length - 1;

    return packOutput.slice(startIndex, endIndex + 1);
}

const fileLineRegExp = /npm notice [\d\.,]+\w+?B\s+(.+?)\s*$/;

async function extractPackFiles(): Promise<string[]> {
    const raw = await getRawPackFileList();
    const lines = raw.slice(1, raw.length - 1);

    const extractedFiles = lines.map((line) => {
        const match = line.match(fileLineRegExp);
        if (!match) {
            throw new Error(`Could not match npm pack file line "${line}" with ${fileLineRegExp}`);
        }
        return match[1];
    });
    return extractedFiles;
}

testGroup(async (runTest) => {
    runTest({
        description: 'verify that we can read package contents without error',
        test: async () => {
            await runBashCommand(packCommand, true);
        },
    });

    runTest({
        description: 'pack file list has contents',
        expect: true,
        test: async () => {
            return !!(await getRawPackFileList()).length;
        },
    });

    runTest({
        description: 'pack file list includes terminator strings',
        expect: [startTrigger, endTrigger],
        test: async () => {
            const rawFiles = await getRawPackFileList();
            return [rawFiles[0], rawFiles[rawFiles.length - 1]];
        },
    });

    runTest({
        description: 'pack file list includes terminator strings',
        expect: [startTrigger, endTrigger],
        test: async () => {
            const rawFiles = await getRawPackFileList();
            return [rawFiles[0], rawFiles[rawFiles.length - 1]];
        },
    });

    runTest({
        description: 'correct number of files extracted',
        expect: 2,
        test: async () => {
            const rawFiles = await getRawPackFileList();
            const packFiles = await extractPackFiles();
            return rawFiles.length - packFiles.length;
        },
    });

    runTest({
        description: 'extracted file names are trimmed',
        expect: await extractPackFiles(),
        test: async () => {
            const packFiles = await extractPackFiles();
            return packFiles.map((file) => file.trim());
        },
    });

    const importantFiles: string[] = [
        'LICENSE',
        'README.md',
        'package.json',
        'dist/index.js',
        'dist/index.d.ts',
    ];

    runTest({
        description: 'no important files should be missing',
        expect: [],
        test: async () => {
            const packFiles = await extractPackFiles();

            return importantFiles.filter((file) => !packFiles.includes(file));
        },
    });

    runTest({
        description: 'no other non-dist and non-important files are included',
        expect: [],
        test: async () => {
            const packFiles = await extractPackFiles();

            return packFiles.filter((file) => {
                if (importantFiles.includes(file)) {
                    return false;
                } else if (file.startsWith(`dist/`)) {
                    return false;
                } else {
                    return true;
                }
            });
        },
    });

    // allow this intentionally misspelled word root
    // cSpell:ignore sanitiz
    const badFilePartialMatches: (string | RegExp)[] = [
        '.pdf',
        'sanitiz',
        'bash',
        /package.*\.ts/i,
        /readme.*\.ts/i,
        'paths',
        '.test.js',
        '.test.d.ts',
    ];

    runTest({
        description: 'no bad files are included',
        expect: [],
        test: async () => {
            const packFiles = await extractPackFiles();

            return packFiles.filter((file) => {
                // if any bad matches are found, include this file
                return badFilePartialMatches.some((matcher) => {
                    if (matcher instanceof RegExp) {
                        return !!file.match(matcher);
                    } else {
                        return file.includes(matcher);
                    }
                });
            });
        },
    });

    runTest({
        description: 'all files in dist are either js or .d.ts files',
        expect: [],
        test: async () => {
            const packFiles = await extractPackFiles();

            const badFiles = packFiles.filter((file) => {
                if (file.startsWith(`dist/`)) {
                    return !file.endsWith('.d.ts') && !file.endsWith('.js');
                } else {
                    return false;
                }
            });
            return badFiles;
        },
    });

    runTest({
        description: 'no .js file should be missing a companion .d.ts file',
        expect: [],
        test: async () => {
            const packFiles = await extractPackFiles();
            const jsFiles = packFiles.filter((file) => file.endsWith('.js'));
            const missingCompanionTsFiles = jsFiles.filter((jsFile) => {
                return !packFiles.includes(jsFile.replace(/\.js$/, '.d.ts'));
            });

            return missingCompanionTsFiles;
        },
    });
});
