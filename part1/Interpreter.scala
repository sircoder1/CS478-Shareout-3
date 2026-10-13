enum Expr:
  case Num(n: Int)
  case Bool(b: Boolean)
  case Var(name: String)
  case Plus(left: Expr, right: Expr)
  case Div(left: Expr, right: Expr)
  case Less(left: Expr, right: Expr)
  case If(test: Expr, yes: Expr, no: Expr)
  case Let(name: String, bound: Expr, body: Expr)
  case And(left: Expr, right: Expr)

enum Value:
  case IntV(n: Int)
  case BoolV(b: Boolean)

enum EvalError:
  case Unbound(name: String)
  case ExpectedInt, ExpectedBool, DivideByZero

type Env = Map[String, Value]

import Expr.*
import Value.*
import EvalError.*

def integer(e: Expr, env: Env): Either[EvalError, Int] =
  eval(e, env).flatMap {
    case IntV(n) => Right(n)
    case _ => Left(ExpectedInt)
  }

def boolean(e: Expr, env: Env): Either[EvalError, Boolean] =
  eval(e, env).flatMap {
    case BoolV(b) => Right(b)
    case _ => Left(ExpectedBool)
  }

def eval(e: Expr, env: Env = Map.empty): Either[EvalError, Value] =
  e match
    case Num(n) => Right(IntV(n))
    case Bool(b) => Right(BoolV(b))
    case Var(name) => env.get(name).toRight(Unbound(name))
    case Plus(left, right) =>
      for
        a <- integer(left, env)
        b <- integer(right, env)
      yield IntV(a + b)
    case Less(left, right) =>
      for
        a <- integer(left, env)
        b <- integer(right, env)
      yield BoolV(a < b)
    case Div(left, right) =>
      for
        a <- integer(left, env)
        b <- integer(right, env)
        result <- if b == 0 then Left(DivideByZero) else Right(IntV(a / b))
      yield result
    case If(test, yes, no) =>
      boolean(test, env).flatMap(b => eval(if b then yes else no, env))
    case Let(name, bound, body) =>
      eval(bound, env).flatMap(v => eval(body, env.updated(name, v)))
    case And(left, right) =>
      boolean(left, env).flatMap { b =>
        if b then boolean(right, env).map(BoolV.apply)
        else Right(BoolV(false))
      }

@main def runTests(): Unit =
  val tests: List[(String, Expr, Either[EvalError, Value])] = List(
    // Catches incorrect addition or literal evaluation.
    ("addition", Plus(Num(2), Num(3)), Right(IntV(5))),
    // Catches floor division instead of truncation toward zero.
    ("negative division", Div(Num(-7), Num(2)), Right(IntV(-3))),
    // Catches integer-valued comparison results.
    ("comparison", Less(Num(2), Num(3)), Right(BoolV(true))),
    // Catches lost incoming bindings, recursive let, or leaked shadowing.
    ("shadowing", Let("x", Num(4), Plus(Let("x", Plus(Var("x"), Num(1)), Var("x")), Var("x"))), Right(IntV(9))),
    // Catches replacing rather than extending the environment.
    ("preserved binding", Let("x", Num(4), Let("y", Num(2), Plus(Var("x"), Var("y")))), Right(IntV(6))),
    // Catches eager evaluation of the unselected branch.
    ("skipped branch", If(Bool(true), Num(7), Div(Num(1), Num(0))), Right(IntV(7))),
    // Catches eager evaluation of the right child of false And.
    ("short circuit", And(Bool(false), Var("missing")), Right(BoolV(false))),
    // Catches an And implementation that always returns false.
    ("true conjunction", And(Bool(true), Bool(true)), Right(BoolV(true))),
    // Catches delayed left operand type checking.
    ("left type first", Div(Bool(true), Div(Num(1), Num(0))), Left(ExpectedInt)),
    // Catches evaluating the right child after a left evaluation error.
    ("left error first", Plus(Var("missing"), Div(Num(1), Num(0))), Left(Unbound("missing"))),
    // Catches missing divisor validation.
    ("zero divisor", Div(Num(1), Num(0)), Left(DivideByZero)),
    // Catches checking only the left type for And.
    ("right boolean type", And(Bool(true), Num(1)), Left(ExpectedBool)),
    // Catches treating an integer as a truthy left operand.
    ("left boolean type", And(Num(0), Var("missing")), Left(ExpectedBool)),
    // Catches making a let binding visible in its own bound expression.
    ("nonrecursive let", Let("x", Var("x"), Num(0)), Left(Unbound("x"))),
    // Catches rejecting unlike branch types even when one is skipped.
    ("different branch types", If(Bool(false), Num(1), Bool(true)), Right(BoolV(true))),
    // Catches checking arithmetic only after a right evaluation error.
    ("addition type first", Plus(Bool(false), Var("missing")), Left(ExpectedInt)),
    // Catches a missing type check for a conditional test.
    ("conditional type", If(Num(1), Num(2), Num(3)), Left(ExpectedBool))
  )
  tests.foreach { (name, ast, expected) =>
    val actual = eval(ast)
    assert(actual == expected, s"$name: expected $expected, got $actual")
  }
  val initial: Env = Map("x" -> IntV(20))
  assert(eval(Let("x", Num(1), Var("x")), initial) == Right(IntV(1)))
  assert(initial == Map("x" -> IntV(20))) // Caller environment stays unchanged.
  println(s"${tests.size + 2} assertions passed")
