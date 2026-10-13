# WordScript: spelling-sensitive integers

Requires Node.js 18 or newer. No package installation or paid service.

    node test.mjs
    node wordscript.mjs run examples/spaces.wordjs
    node wordscript.mjs run examples/age.wordjs "age=Fourty Four"
    node wordscript.mjs run examples/age.wordjs "age=Four Four"
    node wordscript.mjs run examples/sum.wordjs n=Five
    node wordscript.mjs run examples/factorial.wordjs n=Five
    node wordscript.mjs ast examples/age.wordjs

Run commands from this directory. PowerShell users without Node on PATH can invoke the bundled node.exe with `&` and its full path.

## Rules

Number values carry a numeric magnitude and an ordered list of components. Horizontal spaces or tabs separate components. Joined words form one component. `FourtyFour` is [44], magnitude 44. `Fourty Four` is [40,4], magnitude 404. `Four Four` is [4,4], magnitude 44. Both Forty and Fourty spell 40. Supported compounds span Zero through NinetyNine. Original joined digit forms such as FourZeroThree also work. Case matters. Newlines end numeric literals. Comments also separate literals and cannot join their components.

Magnitude comes from concatenating each component's decimal representation. Leading zero components survive in the component list, even when numeric conversion removes the leading zeros. Equality and inequality compare the component lists. Ordering compares integer components left to right, with a shorter equal prefix sorting first. Original punctuation word tokens are retained for the supported subset.

Arithmetic uses magnitude and returns a canonical single-component value. Thus Four Zero != Forty, but Four Zero Plus Zero == Forty. `value(number)` explicitly canonicalizes a number. Arithmetic is integer arithmetic with division truncating toward zero. Unary Minus returns a canonical negative number. Strings are printable and name inputs, but do not participate in arithmetic or comparison. Booleans have strict type checks, and And/Or short-circuit. Comparisons require numbers.

`input("name")`, spelled using parentheses tokens, reads a spelling from the CLI name=value inputs. Printing shows magnitude, intentionally concealing components. Use the AST command to inspect literal component lists. Binding and assignment preserve the complete value, including components.

## Supported language

Explicit lexer, recursive-descent parser, JSON-shaped AST, and recursive interpreter. Supports let/const, reassignment and PlusEquals/MinusEquals, numeric arithmetic/comparison, strict booleans, if/else, while, print and console.log, comments and double-quoted JSON strings. Operators use conventional precedence and left associativity. Operands evaluate left to right with immediate number checks. Bindings have one global scope, including inside blocks. Redeclaration is an error, const reassignment is an error. No functions, arrays, objects, classes, closures, block scope, decimals, general JavaScript, or external I/O. This deliberately implements a smaller interpreted subset rather than preserving the previous translator's full JavaScript surface.

Execution defaults to 10,000 statement/expression steps, with --limit=N configurable. Source length is limited to 100,000 characters, parser nesting to 200 levels, and arithmetic results to 1,000 decimal characters. Execution-limit and other language errors exit with status 1 and a controlled message. Behavior is deterministic. Programs do not execute source as host JavaScript or issue operating-system commands.

## Traces

For the age threshold Fourty Three, threshold components are [40,3], magnitude 403. Input Fourty Four yields [40,4], magnitude 404. The first components tie, then 4 > 3, so the branch prints accepted. Input Four Four yields [4,4], magnitude 44. The first component 4 < 40, so it prints rejected.

For Four Zero Plus Zero EqualEqual Forty: literals carry [4,0], [0], and [40]. Addition computes 40 + 0, then constructs [40]. Equality therefore returns true. Without addition, [4,0] and [40] differ, so equality returns false. This is interaction between numeric representation and ordinary arithmetic; it is not a second independently chosen terrible feature.

The sum and factorial programs call value on input so that loop bounds use canonical numeric values. For n=Five, sum accumulates 1+2+3+4+5=15 and factorial multiplies 1*2*3*4*5=120. For n=Zero, neither loop executes, leaving 0 and 1 respectively. Intended inputs are nonnegative integers. These examples are not an input validation library.

## Verification and mutation

test.mjs has explicit expected results for 25 distinct programs plus two direct assertions. It covers isolated spelling effects, arithmetic/representation interactions, errors, skipped evaluation, and two ordinary tasks with two inputs each. Expected outputs are written explicitly rather than obtained from a second invocation of the interpreter. They were reasoned by AI from the user's examples and these documented rules; the group must independently review them.

The mutation experiment writes a temporary copy and changes default comparison from component comparison to numeric comparison. Four Zero == Forty should print false; the mutant prints true and fails the original assertion. The temporary copy is removed after the experiment. This is an actual semantic mutation, not merely a changed expected result.

## Ownership and remaining requirements

The user supplied the spelling/spacing idea in chat and confirmed FourtyFour=44 versus Fourty Four=404. AI implemented the lexer/parser/interpreter, tests, examples, and these technical notes. AI selected completion rules for arithmetic canonicalization, prefix ordering, aliases, strict types, scope, and limits. Those choices need group review. The chat is the existing human design evidence; no document here pretends to be a previously saved human-written note.

Only one required terrible semantic feature is implemented. The assignment requires another feature from a different semantic family and interactions between both. Genuine group design judgments, initial note, individual notes, division of work, DAAW cover information, final LaTeX/PDF report, and Part I compilation/starter-suite integration remain unfinished. Do not submit this as a complete SO3 assignment.
