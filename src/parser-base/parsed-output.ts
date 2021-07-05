export type ParsedTransaction = {
    date: Date;
    amount: number;
    description: string;
};

/**
 * Incomes vs Expenses means different thing for different account types
 *
 * Incomes For credit cards, an "income" transaction is a payment on the credit card For bank
 * accounts or debit cards, an "income" is a deposit
 *
 * Expenses For credit cards, an "expense" is a purchase or credit charge For bank accounts or debit
 * cards, an "expense" is a withdrawal or debit charge
 *
 * YearPrefix is the first two digits of the current year accountSuffix is the last digits of the
 * account number (this is usually 4 digits long)
 */
export type ParsedOutput<T extends ParsedTransaction = ParsedTransaction> = {
    incomes: T[];
    expenses: T[];
    accountSuffix: string;
    filePath: string;
    startDate?: Date;
    endDate?: Date;
};

export type InitOutput<FullOutputType extends ParsedOutput> = Partial<
    Omit<FullOutputType, 'filePath'>
>;
