import {testGroup} from 'test-vir';
import {allIndexesOf, replaceStringAtIndex} from './string';

testGroup({
    description: allIndexesOf.name,
    tests: (runTest) => {
        runTest({
            description: 'should find all substring instances in a string',
            expect: [2, 5, 11, 18, 24, 31],
            test: () => {
                return allIndexesOf('who would hocked your thought now?', 'o');
            },
        });

        runTest({
            description: 'should handle substring at the beginning of the string correctly',
            expect: [0, 3],
            test: () => {
                return allIndexesOf('a fan is here', 'a');
            },
        });

        runTest({
            description: 'should handle the substring at the end of the string only',
            expect: [10],
            test: () => {
                return allIndexesOf('boiled eggs', 's');
            },
        });

        runTest({
            description: 'should handle the substring at the end and beginning of the string',
            expect: [0, 8],
            test: () => {
                return allIndexesOf('some eggs', 's');
            },
        });

        runTest({
            description: 'should handle longer words',
            expect: [5, 15, 29, 41, 50],
            test: () => {
                return allIndexesOf('when you go to you to have a you because you like you', 'you');
            },
        });

        runTest({
            description: 'should match multiple in a row',
            expect: [0, 3, 6, 9, 12, 15],
            test: () => {
                return allIndexesOf('YouYouYouYouYouYou', 'You');
            },
        });

        runTest({
            description: 'should not match case mismatch',
            expect: [0, 20],
            test: () => {
                return allIndexesOf('You are not you but You', 'You');
            },
        });

        runTest({
            description: 'should honor case insensitive set to true',
            expect: [0, 12, 20],
            test: () => {
                return allIndexesOf('You are not you but You', 'You', true);
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
    },
});
