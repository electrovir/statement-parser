import {testGroup} from 'test-vir';
import {trimArray} from '../augments/array';
import {sanitizeStatementText} from './sanitizer';

testGroup((runTest) => {
    const unSanitized = trimArray(
        `
            secret account number: 123-456-789
            $30     super secret purchase don't tell anyone about it
            $100    another secret thing 456677
        `.split('\n'),
    );

    const keywords = ['account number'];

    runTest({
        description: 'output length should be the same',
        expect: unSanitized.length,
        test: () => {
            const sanitized = sanitizeStatementText(unSanitized);
            return sanitized.length;
        },
    });

    runTest({
        description: 'original text should not exist',
        expect: 0,
        test: () => {
            const sanitized = sanitizeStatementText(unSanitized);

            const matchingRows = sanitized.filter(
                (sanitizedRow, index) => sanitizedRow === unSanitized[index],
            );

            return matchingRows.length;
        },
    });

    runTest({
        description: 'keywords should be preserved only in the row where they exist',
        expect: unSanitized.filter((dirtyRow) => dirtyRow.includes(keywords[0])).length,
        test: () => {
            const sanitized = sanitizeStatementText(unSanitized, keywords);

            const matchingRows = sanitized.filter((sanitizedRow) =>
                sanitizedRow.includes(keywords[0]),
            );

            return matchingRows.length;
        },
    });

    runTest({
        description: 'should replace text in a deterministic and unique manner',
        expect: trimArray(
            `
                a account number: 0-1-2
                $3  d e f g h i j k
                $4  l m n 5
            `.split('\n'),
        ),
        test: () => {
            const sanitized = sanitizeStatementText(unSanitized, keywords);

            return sanitized;
        },
    });

    runTest({
        description: 'should work with RegExp keywords',
        expect: trimArray(
            `
                a account number: 0-1-2
                $3  super secret purchase g h i j k
                $4  l m n 5
            `.split('\n'),
        ),
        test: () => {
            const sanitized = sanitizeStatementText(unSanitized, [
                ...keywords,
                /super \S+ purchase/,
            ]);

            return sanitized;
        },
    });
});
