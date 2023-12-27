export type CompositeKey = { pk: string; sk: string; index?: 'gsi1' | 'gsi2' };

export type CompositeKeyQuery = { pk: string; sk?: string; index?: 'gsi1' | 'gsi2' };
