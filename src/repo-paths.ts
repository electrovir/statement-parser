import {join} from 'path';

export const repoRootDir = __dirname.replace(/(?:src|dist).*/, '');
export const sampleFileDir = join(repoRootDir, 'sample-files');
export const dummyPdfPath = join(sampleFileDir, 'dummy.pdf');
