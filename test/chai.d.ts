declare namespace Chai {
  interface Assertion {
    /**
     * A way to compare strings without worrying about whitespaces
     */
    equalWI(expected: string): void;
  }
}
