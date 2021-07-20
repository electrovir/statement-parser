import {testGroup} from 'test-vir';
import {createUtcDate, InvalidDateError} from './date';

testGroup({
    description: createUtcDate.name,
    tests: (runTest) => {
        runTest({
            description: 'deDupes consecutive flags',
            expect: '2020-02-20T00:00:00.000Z',
            test: () => createUtcDate('2020-02-20').toISOString(),
        });
        runTest({
            description: 'deDupes nonconsecutive flags',
            expectError: {
                errorClass: InvalidDateError,
            },
            test: () => String(createUtcDate('nothing to see here')),
        });
    },
});
