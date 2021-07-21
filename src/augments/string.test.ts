import {testGroup} from 'test-vir';
import {allIndexesOf, escapeForRegExp, replaceStringAtIndex, splitIncludeSplit} from './string';

testGroup({
    description: allIndexesOf.name,
    tests: (runTest) => {
        runTest({
            description: 'should find all substring instances in a string',
            expect: [2, 5, 11, 18, 24, 31],
            test: () => {
                return allIndexesOf('who would hocked your thought now?', 'o', false);
            },
        });

        runTest({
            description: 'should find all regex instances in a string',
            expect: [2, 5, 11, 18, 24, 31],
            test: () => {
                return allIndexesOf('who would hocked your thought now?', /o/, false);
            },
        });

        runTest({
            description: 'should find all RegExp matches with a capture group',
            expect: [2, 5, 11, 18, 24, 31],
            test: () => {
                return allIndexesOf('who would hocked your thought now?', /(o)/, false);
            },
        });

        runTest({
            description: 'should handle substring at the beginning of the string correctly',
            expect: [0, 3],
            test: () => {
                return allIndexesOf('a fan is here', 'a', false);
            },
        });

        runTest({
            description: 'should handle the substring at the end of the string only',
            expect: [10],
            test: () => {
                return allIndexesOf('boiled eggs', 's', false);
            },
        });

        runTest({
            description: 'should handle the substring at the end and beginning of the string',
            expect: [0, 8],
            test: () => {
                return allIndexesOf('some eggs', 's', false);
            },
        });

        runTest({
            description: 'should handle longer words',
            expect: [5, 15, 29, 41, 50],
            test: () => {
                return allIndexesOf(
                    'when you go to you to have a you because you like you',
                    'you',
                    true,
                );
            },
        });

        runTest({
            description: 'should match multiple in a row',
            expect: [0, 3, 6, 9, 12, 15],
            test: () => {
                return allIndexesOf('YouYouYouYouYouYou', 'You', false);
            },
        });

        runTest({
            description: 'should not match case mismatch',
            expect: [0, 20],
            test: () => {
                return allIndexesOf('You are not you but You', 'You', true);
            },
        });

        runTest({
            description: 'should honor case insensitive set to true',
            expect: [0, 12, 20],
            test: () => {
                return allIndexesOf('You are not you but You', 'You', false);
            },
        });

        runTest({
            description: 'includes correct lengths for simple strings',
            expect: [
                {index: 0, length: 3},
                {index: 12, length: 3},
                {index: 20, length: 3},
            ],
            test: () => {
                return allIndexesOf('You are not you but You', 'You', false, true);
            },
        });

        runTest({
            description: 'includes correct lengths for variable RegExp matches',
            expect: [
                {index: 0, length: 10},
                {index: 19, length: 4},
                {index: 28, length: 3},
            ],
            test: () => {
                return allIndexesOf('YoAaAaAaAu are not yoAu but You', /Yo.*?u/i, false, true);
            },
        });

        runTest({
            description: 'includes correct lengths for more RegExp matches',
            expect: [
                {index: 6, length: 8},
                {index: 18, length: 3},
                {index: 41, length: 6},
            ],
            test: () => {
                return allIndexesOf(
                    'hello YoAaAaAu do you have some time for yoZzZu?',
                    /yo.*?u/i,
                    false,
                    true,
                );
            },
        });
    },
});

testGroup({
    description: replaceStringAtIndex.name,
    tests: (runTest) => {
        runTest({
            description: 'should insert a string at the desire index without edge cases',
            expect: 'eat his waffles',
            test: () => {
                return replaceStringAtIndex('eat the waffles', 4, 'his');
            },
        });

        runTest({
            description: 'should insert the string at the beginning',
            expect: 'cut the waffles',
            test: () => {
                return replaceStringAtIndex('eat the waffles', 0, 'cut');
            },
        });

        runTest({
            description: 'should replace the string at the end',
            expect: 'race the racy car!',
            test: () => {
                const originalString = 'race the race';
                return replaceStringAtIndex(originalString, originalString.length - 1, 'y car!');
            },
        });

        runTest({
            description: 'should replace longer text with shorter text',
            expect: 'eat my waffles',
            test: () => {
                return replaceStringAtIndex('eat the waffles', 4, 'my', 3);
            },
        });

        runTest({
            description: 'should insert text is length is 0',
            expect: 'eat the blueberry waffles',
            test: () => {
                return replaceStringAtIndex('eat the waffles', 8, 'blueberry ', 0);
            },
        });

        runTest({
            description: 'should work with length when start index is 0 and replacement is shorter',
            expect: ' of',
            test: () => {
                return replaceStringAtIndex(' a b c', 0, ' of', 6);
            },
        });

        runTest({
            description: 'should work with length when start index is 0 and replacement is longer',
            expect: ' super duper thing',
            test: () => {
                return replaceStringAtIndex(' a b c', 0, ' super duper thing', 6);
            },
        });
    },
});

testGroup({
    description: escapeForRegExp.name,
    tests: (runTest) => {
        runTest({
            expect: '\\[\\*\\.\\*\\]',
            description: 'should escape regexp characters',
            test: () => {
                return escapeForRegExp('[*.*]');
            },
        });

        runTest({
            expect: ['[*.*]'],
            description: 'escaped text works as a RegExp',
            test: () => {
                return '[*.*]'.match(new RegExp(escapeForRegExp('[*.*]')));
            },
        });
    },
});

testGroup({
    description: splitIncludeSplit.name,
    tests: (runTest) => {
        runTest({
            expect: ['hello ', 'YoAaAaAu', ' do ', 'you', ' have some time for ', 'yoZzZu', '?'],
            description: 'splits by variable length RegExp matches',
            test: () => {
                return splitIncludeSplit(
                    'hello YoAaAaAu do you have some time for yoZzZu?',
                    /yo.*?u/i,
                    false,
                );
            },
        });

        runTest({
            expect: ['hello ', 'You', ' do ', 'you', ' have some time for ', 'you', '?'],
            description: 'splits by a simple string',
            test: () => {
                return splitIncludeSplit('hello You do you have some time for you?', 'you', false);
            },
        });
    },
});
