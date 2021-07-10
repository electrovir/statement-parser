import {testGroup} from 'test-vir';
import {addRegExpFlags, deDupeRegExFlags} from './regexp';

testGroup({
    description: deDupeRegExFlags.name,
    tests: (runTest) => {
        runTest({
            description: 'deDupes consecutive flags',
            expect: 'ig',
            test: () => deDupeRegExFlags('iIiIgGgG'),
        });
        runTest({
            description: 'deDupes nonconsecutive flags',
            expect: 'ig',
            test: () => deDupeRegExFlags('igIgI'),
        });
    },
});

testGroup({
    description: addRegExpFlags.name,
    tests: (runTest) => {
        runTest({
            description: 'adds flags to a RegExp',
            expect: 'i',
            test: () => addRegExpFlags(/nothing to see here/, 'i').flags,
        });
        runTest({
            description: 'does not duplicate flags',
            expect: 'i',
            test: () => addRegExpFlags(/nothing to see here/i, 'i').flags,
        });
        runTest({
            description: 'preserves original flags',
            expect: 'gi',
            test: () => addRegExpFlags(/nothing to see here/g, 'i').flags,
        });
    },
});
