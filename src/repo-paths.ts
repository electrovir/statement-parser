import {join} from 'path';

export const repoRootDir = __dirname.replace(/(?:src|dist).*/, '');
export const sampleFileDir = join(repoRootDir, 'sample-files');
export const dummyPdfPath = join(sampleFileDir, 'dummy.pdf');
export const downloadsDir = join(repoRootDir, 'downloads');

export const temp_sanitizerRawTestFilePath = join(downloadsDir, 'last-raw-text-for-sanitizer.txt');
export const temp_sanitizerSanitizedTextFilePath = join(downloadsDir, 'last-sanitized-text.txt');
