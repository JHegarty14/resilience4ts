import { OperationCancelledException } from '../exceptions';
import { Constructable } from '../types';

type PredicateHandler = (result: any) => boolean;

interface InternalPredicate<T> {
  (x: T): boolean;
}

export class PredicateBuilder {
  private condition: InternalPredicate<any>;

  constructor(condition?: InternalPredicate<any> | Constructable) {
    if (condition && isClass(condition)) {
      this.condition = (args: unknown) => args instanceof condition;
    } else if (condition) {
      this.condition = condition as InternalPredicate<any>;
    } else {
      this.condition = () => true;
    }
  }

  and(input: Constructable): PredicateBuilder;
  and(input: PredicateHandler): PredicateBuilder;
  and(input: Constructable | PredicateHandler): PredicateBuilder {
    const condition = this.condition;
    if (isClass(input)) {
      this.condition = (args: unknown) => condition(args) && args instanceof input;

      return this;
    }
    this.condition = (args: unknown) => condition(args) && (input as PredicateHandler)(args);

    return this;
  }

  or(input: Constructable): PredicateBuilder;
  or(input: PredicateHandler): PredicateBuilder;
  or(input: Constructable | PredicateHandler): PredicateBuilder {
    const condition = this.condition;
    if (isClass(input)) {
      this.condition = (args: unknown) => condition(args) || args instanceof input;

      return this;
    }

    this.condition = (args: unknown) => condition(args) || (input as PredicateHandler)(args);

    return this;
  }

  isnot(input: Constructable): PredicateBuilder;
  isnot(input: PredicateHandler): PredicateBuilder;
  isnot(input: Constructable | PredicateHandler): PredicateBuilder {
    const condition = this.condition;

    if (isClass(input)) {
      this.condition = (args: unknown) => condition(args) && !(args instanceof input);

      return this;
    }
    this.condition = (args: unknown) => condition(args) && !(input as PredicateHandler)(args);

    return this;
  }

  eval(input: unknown) {
    return this.condition(input);
  }
}

export const defaultPredicateBuilder = new PredicateBuilder()
  .isnot(OperationCancelledException)
  .and((result: unknown) => result instanceof Error);

function isClass(v: unknown) {
  return typeof v === 'function' && /^\s*class\s+/.test(v.toString());
}
