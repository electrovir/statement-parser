import {testGroup, TestInputObject} from 'test-vir';
import {trimArray} from '../augments/array';
import {ParserKeyword} from '../parser/parser-options';
import {collapseAroundKeyword, sanitizeStatementText} from './sanitizer';

testGroup({
    description: collapseAroundKeyword.name,
    tests: (runTest) => {
        function collapseTest(
            keyword: ParserKeyword,
            input: string,
            expect: string,
            description?: string,
            debug = false,
            extraOptions?: Omit<
                Partial<TestInputObject<string[], unknown>>,
                'description' | 'expect' | 'test'
            >,
        ) {
            runTest({
                ...(extraOptions as any),
                description,
                expect,
                test: () => {
                    return collapseAroundKeyword(keyword, input, debug);
                },
            });
        }

        collapseTest('cow', 'a b c d cow e f g h i', 'd cow i');
        collapseTest('cow', '  a b c d cow e f g h i  ', '  d cow i  ');
    },
});

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
                    a account number 1-2-3
                    $4  k
                    $5  n 6
                `.split('\n'),
                ),
                keywords,
                'should replace text in a deterministic and unique manner',
            );

            sanitizerTest(
                unSanitized,
                trimArray(
                    `
                    a account number 1-2-3
                    $4  super secret purchase k
                    $5  n 6
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
                '  5678 one thing 9876 9999                                10.63 95632 cow 789',
                '  Van 9876                                                 11.11 cow',
            ],
            ['  1 b 2 3  4,444.44 5 cow 6', '  d 7  8,888.88 cow'],
            ['cow'],
            'handle keywords when replacement numbers are longer',
        );

        sanitizerTest(
            ['lorem ipsum dolor sit amet, consectetur-cow adipiscing'],
            ['e f-cow h'],
            ['cow'],
            'handle keywords after dashes',
        );

        sanitizerTest(
            [
                '(555)555-555 (555) 555 555 (555)-555-555 5 (555)555-ABCDEF hoops - 7 ABCDEF (HACK), 555 FA FunTimes',
            ],
            ['(1)2-3 (4) 5 6 (7)-8-9 1 (2)3-b - 4 c (d), 6 f'],
            [],
            'maintain parentheses',
        );
    },
});
