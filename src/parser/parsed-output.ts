export type ParsedTransaction = {
    date: Date;
    amount: number;
    description: string;
    originalText: string[];
};

export type ParsedOutput<T extends ParsedTransaction = ParsedTransaction> = {
    /**
     * For credit cards, an "income" transaction is a payment on the credit card. For bank accounts
     * or debit cards, an "income" is a deposit.
     */
    incomes: T[];
    /**
     * For credit cards, an "expense" is a purchase or credit charge. For bank accounts or debit
     * cards, an "expense" is a withdrawal or debit charge.
     */
    expenses: T[];
    accountSuffix: string;
    name?: string;
    /**
     * YearPrefix is the first two digits of the current year accountSuffix is the last digits of
     * the account number (this is usually 4 digits long)
     */
    yearPrefix: number;
    startDate?: Date;
    endDate?: Date;
};

export type InitOutput<FullOutputType extends ParsedOutput> = Partial<
    Omit<FullOutputType, 'filePath'>
>;
