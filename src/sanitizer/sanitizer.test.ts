import {testGroup, TestInputObject} from 'test-vir';
import {trimArray} from '../augments/array';
import {ParserKeyword} from '../parser/parser-options';
import {sanitizeStatementText} from './sanitizer';

testGroup({
    tests: (runTest) => {
        function sanitizerTest(
            input: string[],
            expectation: string[],
            keywords: ParserKeyword[] = [],
            description?: string,
            debug = false,
            extraOptions?: Omit<
                Partial<TestInputObject<string[], unknown>>,
                'description' | 'expect' | 'test'
            >,
        ): void {
            runTest({
                ...(extraOptions as any),
                description,
                expect: expectation,
                test: () => {
                    const sanitized = sanitizeStatementText(input, keywords, debug);

                    return sanitized;
                },
            });
        }
        {
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
                    const sanitized = sanitizeStatementText(unSanitized, [], false);
                    return sanitized.length;
                },
            });

            runTest({
                description: 'original text should not exist',
                expect: 0,
                test: () => {
                    const sanitized = sanitizeStatementText(unSanitized, [], false);

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
                    const sanitized = sanitizeStatementText(unSanitized, keywords, false);

                    const matchingRows = sanitized.filter((sanitizedRow) =>
                        sanitizedRow.includes(keywords[0]),
                    );

                    return matchingRows.length;
                },
            });

            sanitizerTest(
                unSanitized,
                trimArray(
                    `
                    a account number 0-1-2
                    $3  k
                    $4  n 5
                `.split('\n'),
                ),
                keywords,
                'should replace text in a deterministic and unique manner',
            );

            sanitizerTest(
                unSanitized,
                trimArray(
                    `
                    a account number 0-1-2
                    $3  super secret purchase g h i j k
                    $4  n 5
            `.split('\n'),
                ),
                [...keywords, /super \S+ purchase/],
                'should work with RegExp keywords',
            );
        }

        sanitizerTest(
            [' super duper thing', ' secret stuff delete  '],
            [' super duper thing', ' f  '],
            [/\s+super duper thing/],
            'RegExp keywords should work with preceding spaces',
        );

        sanitizerTest(
            [
                '(555)555-555 (555) 555 555 (555)-555-555 5 (555)555-ABCDEF hoops - 7 ABCDEF (HACK), 555 FA FunTimes',
            ],
            ['(0)1-2 (3) 4 5 (6)-7-8 9 (0)1-b - 2 c (d), 4 f'],
            [],
            'maintain parentheses',
        );
    },
});
