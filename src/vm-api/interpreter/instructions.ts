// API for an Embedding System to define its own opcodes.

import { RuntimeError, ValidationProblem } from '../../errors'
import { RuntimeSourcePosition } from '../../source'
import { EvaluatedValue, MemoryCell, MemoryValue, VmOpCode } from '../memory-store'
import { VmType } from '../type-system'
import { StructuredKeyType } from '../type-system/categories'
import { ScriptContext } from './loaded-script'

// GeneratedError The opcode execution generated a runtime error.
export interface GeneratedError {
    error: RuntimeError
}

// GeneratedValue The opcode execution generated an evaluated value.
export interface GeneratedValue {
    value: EvaluatedValue
}

// ReducedrValue The opcode returns a script function or opcode
//   that will reduce the values in the list to a single evaluated value.
//   By returning this as an explicit reduce operation, it allows the
//   interpreter to perform optimizations on the evaluation and reduction.
//   Reduction must always be done to maintain ordering of items, but takes
//   advantage of the associative property (a + (b + c) = (a + b) + c) by
//   possibly combining terms in non-sequential order.
//   Therefore, the operator must be associative for correctness in this
//   type of return value.
export type ReducerValue = OpCodeReducerValue | FunctionReducerValue

// OpCodeReducerValue A reducer that runs through an opcode.
export interface OpCodeReducerValue {
    // opcode The opcode to perform the reduction.
    //   For opcodes, the first and second arguments are the ordered
    //   pair to reduce.
    //   The third value is the context.
    opcode: VmOpCode

    // context Additional context passed to each function or opcode.
    //   If the opcode accepts three arguments,
    //   then the context MUST be set and MUST be of the opcode's third
    //   argument type.
    context?: MemoryValue

    // initialValue The value passed to the opcode if there are not enough values to perform a reduction.
    //   If the iterator only contains zero or one element, this is passed as the first, and
    //   possibly the second, value to the opcode.
    initialValue: MemoryValue
}

// FunctionReducerValue A reducer that runs through a user function.
export interface FunctionReducerValue {
    // function The user function that will reduce the values.
    //   The value must be of VmCallableType.  Its argument
    //   must take only the keys included in this reducer value.
    function: MemoryValue

    // firstValueKey The key in the function's argument that will contain the first value.
    //   The function's argument must include this key, and its type must conform to the
    ///  list's type.  If there are no elements in the iterable, then the initialValue is
    //   passed to this key.
    firstValueKey: StructuredKeyType

    // secondValueKey The key in the function's argument that will contain the second value.
    //   The function's argument must include this key, and its type must conform to the
    ///  list's type.  If there are zero or one elements in the iterable, then the initialValue is
    //   passed to this key.
    secondValueKey: StructuredKeyType

    // contextKey Set to the function's argument key, if the function takes an additional context argument.
    //   If set, the context must also be set.
    contextKey?: StructuredKeyType

    // context Additional context passed to each function or opcode.
    //   If the function accepts the context key,
    //   then the context MUST be set and MUST be of the function argument's
    //   context key type.
    context?: MemoryValue

    // initialValue The value passed to the function if there are not enough values to perform a reduction.
    //   If the iterator only contains zero or one element, this is passed as the first, and
    //   possibly the second, value to the function.
    initialValue: MemoryValue
}

// OpCodeArgument An argument to the opcode.
export interface OpCodeArgument {
    // type The argument type.
    type: VmType

    // evaluated Set to true of the value must be evaluated to at least
    //   its simple form.  For iterables and structures, the later values
    //   should also be used.
    evaluated?: boolean

    // iterableValuesResolved Set to true if the type is iterable and
    //   all values in the iterable must be evaluated to a value before
    //   calling this opcode.
    //   Without this, a list of possibly non-evaluated memory cells is passed.
    iterableValuesEvaluated?: boolean

    // structuredValuesEvaluated Set to true if the type is structured and
    //   all keyed values in the structure must be evaluated to a value before
    //   calling this opcode.
    //   Without this, the value for each key may not be evaluated.
    structuredValuesEvaluated?: boolean
}

export type OpCodeResult = GeneratedError | GeneratedValue | ReducerValue


// OpCodeImpl An opcode implementation for the interpreter to use.
export interface OpCodeInstruction {
    // source Where this opcode came from.
    readonly source: RuntimeSourcePosition

    // opcode The mnemonic used by the functions to refer to this opcode.
    readonly opcode: VmOpCode

    // argumentTypes The argument types accepted by this instruction.
    //   All arguments to the actual instruction take a memory value.
    //   Unlike user functions, instructions take a list of typed arguments.
    readonly argumentTypes: OpCodeArgument[]

    // returnType The exected return type from the opcode.
    readonly returnType: VmType

    // validate Called at script load time to determine whether the arguments are valid.
    //   Standard type checking and value count is done automatically, so that isn't necessary.
    validate(
        source: RuntimeSourcePosition,
        context: ScriptContext,
        args: MemoryCell[],
        returnType: VmType,
    ): ValidationProblem[]

    // evaluate Performs the value evaluation based on the arguments.
    evaluate(
        source: RuntimeSourcePosition,
        context: ScriptContext,
        args: MemoryValue[],
        returnType: VmType,
    ): OpCodeResult
}
