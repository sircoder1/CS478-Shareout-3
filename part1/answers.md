# Part I prepared answers

AI-generated prepared work for group review and attribution. The expected results below follow the specified rules independently of implementation execution. Compilation has not yet been verified.

## Problems 1 and 2

Interpreter.scala implements all nine forms. The integer and boolean helpers evaluate and immediately check an operand before flatMap permits subsequent evaluation. Immutable environment updates preserve the caller's bindings.

`And(Bool(false), Var("missing"))` returns `Right(BoolV(false))`. The entire right subtree, `Var("missing")`, must be skipped because the left boolean is false. Evaluating it would produce `Unbound("missing")`. `And(Bool(true), Bool(true))` returns `Right(BoolV(true))` and detects an implementation that always returns false. Evaluated operands must still be booleans: `And(Num(0), Var("missing"))` and `And(Bool(true), Num(1))` both produce `ExpectedBool`.

## Problem 3

1. The outer bound evaluates to IntV(4), then the outer body runs with x = 4.
2. The left operand is an inner Let. Its bound expression runs in the incoming environment. The x in `Plus(Var("x"), Num(1))` therefore uses the outer binding, 4, producing 5.
3. The inner body's x uses the new inner binding, 5. The inner Let returns IntV(5).
4. The right operand's x uses the outer binding, 4. The inner binding has not altered that environment.
5. The final result is `Right(IntV(9))`.

## Problem 4

`Map(name -> v)` discards every existing binding. For example:

`Let("x", Num(4), Let("y", Num(2), Plus(Var("x"), Var("y"))))`

The correct interpreter returns `Right(IntV(6))`. The faulty rule replaces the outer environment with only y = 2, so lookup of x returns `Left(Unbound("x"))`. All bindings originate inside this AST.

Corrected line: `case Right(v) => eval(body, env.updated(name, v))`

## Problem 5

`Div(Bool(true), Div(Num(1), Num(0)))`: visit the outer Div and evaluate Bool(true), yielding BoolV(true). Immediately check the left operand's integer requirement and return `Left(ExpectedInt)`. Never evaluate the right Div or its literals.

`Plus(Var("missing"), Div(Num(1), Num(0)))`: visit the outer Plus and evaluate Var("missing"). Lookup returns `Left(Unbound("missing"))`. Never evaluate the right Div or its literals.

The first AST distinguishes delayed type checking: that alternative evaluates Bool(true) successfully as a value, then evaluates the right Div and both its integer literals, reaching DivideByZero before checking the outer operand types. The second AST does not distinguish the rules because lookup is already an evaluation error, which stops both interpreters. Left-to-right specifies operand order but does not specify whether type checking occurs between operand evaluations or after both.
