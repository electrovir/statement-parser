type Property = string | number | symbol;

type Diff<T extends Property, U extends Property> = ({[P in T]: P} &
    {[P in U]: never} &
    {[x in string | number]: never})[T];
export type Overwrite<T, U> = {[P in Diff<keyof T, keyof U>]: T[P]} & U;
