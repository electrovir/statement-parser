import {readdir, stat} from 'fs-extra';
import {join} from 'path';

export const repoRootDir = __dirname.replace(/(?:src|dist).*/, '');

export const filesDir = join(repoRootDir, 'files');

export const sampleFilesDir = join(filesDir, 'sample-files');
export const dummyPdfPath = join(sampleFilesDir, 'dummy.pdf');
export const sanitizedFilesDir = join(sampleFilesDir, 'sanitized');

export const tempOutputDir = join(filesDir, 'temp-output');
export const temp_sanitizerRawTestFilePath = join(tempOutputDir, 'last-raw-text-for-sanitizer.txt');
export const temp_sanitizerSanitizedTextFilePath = join(tempOutputDir, 'last-sanitized-text.txt');

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
