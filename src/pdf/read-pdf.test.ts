import {collapseSpaces} from 'augment-vir';
import {join} from 'path';
import {testGroup} from 'test-vir';
import {sampleFilesDir} from '../repo-paths';
import {readPdf} from './read-pdf';

testGroup({
    description: readPdf.name,
    tests: (runTest) => {
        runTest({
            description: 'can read pdfkit output',
            expect: 'Some text with an embedded font! PNG and JPEG images:',
            test: async () => {
                const pages = await readPdf(join(sampleFilesDir, 'pdfkit-out.pdf'));
                return collapseSpaces((pages[0] || []).join(' '));
            },
        });
    },
});
