import {testGroup} from 'test-vir';
import {flatten2dArray, trimArray} from './array';

testGroup({
    description: trimArray.name,
    tests: (runTest) => {
        runTest({
            description: 'white space is removed',
            expect: ['who is this', 'what do you want', 'hello there'],
            test: () => {
                return trimArray(
                    `
                    who is this
                    what do you want
                    hello there
                    
                    
                `.split('\n'),
                );
            },
        });
    },
});

testGroup({
    description: flatten2dArray.name,
    tests: (runTest) => {
        runTest({
            description: 'array ordering is preserved and collapsed',
            expect: [1, 2, 3, 4, 5, 6, 0, 7, 8, 9, 10, 11, 12, 21, 22, 22, 1, 0, -1],
            test: () => {
                return flatten2dArray([
                    [1, 2, 3],
                    [4, 5, 6, 0],
                    [7, 8, 9],
                    [10],
                    [11, 12],
                    [21, 22, 22, 1, 0, -1],
                ]);
            },
        });
    },
});
