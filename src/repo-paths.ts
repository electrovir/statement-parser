import {join} from 'path';

export const repoRootDir = __dirname.replace(/(?:src|dist).*/, '');

const filesDir = join(repoRootDir, 'files');

export const sampleFileDir = join(filesDir, 'sample-files');
export const dummyPdfPath = join(sampleFileDir, 'dummy.pdf');

export const tempOutputDir = join(filesDir, 'temp-output');
export const temp_sanitizerRawTestFilePath = join(tempOutputDir, 'last-raw-text-for-sanitizer.txt');
export const temp_sanitizerSanitizedTextFilePath = join(tempOutputDir, 'last-sanitized-text.txt');
