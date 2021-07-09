import {testGroup} from 'test-vir';
import {deDupeFlags} from './regexp';

testGroup({
    description: deDupeFlags.name,
    tests: (runTest) => {
        runTest({
            description: 'deDupes consecutive flags',
            expect: 'ig',
            test: () => deDupeFlags('iIiIgGgG'),
        });
        runTest({
            description: 'deDupes nonconsecutive flags',
            expect: 'ig',
            test: () => deDupeFlags('igIgI'),
        });
    },
});
