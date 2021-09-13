import {RequiredAndDefined} from './type';
type Options = {
    a?: string | undefined;
    b?: string | undefined;
    c?: string | undefined;
};

// @ts-expect-error
const thingie: RequiredAndDefined<Options> = {a: undefined, b: undefined, c: undefined};
