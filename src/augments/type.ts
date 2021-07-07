type Property = string | number | symbol;

type Diff<T extends Property, U extends Property> = ({[P in T]: P} &
    {[P in U]: never} &
    {[x in string | number]: never})[T];
export type Overwrite<T, U> = {[P in Diff<keyof T, keyof U>]: T[P]} & U;

export type IfEquals<T, U, Y = unknown, N = never> = (<G>() => G extends T ? 1 : 2) extends <
    G,
>() => G extends U ? 1 : 2
    ? Y
    : N;
