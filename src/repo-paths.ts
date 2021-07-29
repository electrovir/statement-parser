import {readdir, stat} from 'fs-extra';
import {join} from 'path';

/**
 * Path to the repo's root. Does not use the package name because the source code could
 * theoretically be cloned into any folder. "src" is used for the ts source code files (so they CAN
 * be run directly without transpiling it into JS) and "dist" is used for the transpiled JS output directory.
 */
export const repoRootDir = __dirname.replace(/(?:src|dist).*/, '');

export const filesDir = join(repoRootDir, 'files');

export const sampleFilesDir = join(filesDir, 'sample-files');
export const dummyPdfPath = join(sampleFilesDir, 'dummy.pdf');
export const sanitizedFilesDir = join(sampleFilesDir, 'sanitized');

export const tempOutputDir = join(filesDir, 'temp-output');
export const temp_sanitizerRawTestFilePath = join(tempOutputDir, 'last-raw-text-for-sanitizer.txt');
export const temp_sanitizerSanitizedTextFilePath = join(tempOutputDir, 'last-sanitized-text.txt');

export const packageJson = join(repoRootDir, 'package.json');

export async function getAllRecursiveFiles(
    parentDirectory: string,
    includeFolders = false,
): Promise<Set<string>> {
    const firstLevelFiles = await readdir(parentDirectory);

    return await firstLevelFiles.reduce(async (rawAccum: Promise<Set<string>>, child) => {
        const accum = await rawAccum;
        const path = join(parentDirectory, child);
        if ((await stat(path)).isDirectory()) {
            if (includeFolders) {
                accum.add(child);
            }
            (await getAllRecursiveFiles(path)).forEach((ancestor) =>
                accum.add(join(child, ancestor)),
            );
        } else {
            accum.add(child);
        }
        return accum;
    }, Promise.resolve(new Set<string>()));
}
