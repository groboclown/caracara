// Values returned by opcodes and other parts of the system.

import { RuntimeError } from '../../errors'
import { isRuntimeError } from '../../errors/struct'
import { EvaluatedValue, MemoryValue, VmOpCode } from '.'
import { StructuredKeyType } from '../type-system/categories'

// GeneratedError The opcode execution generated a runtime error.
export interface GeneratedError {
    error: RuntimeError
}

// GeneratedValue The opcode execution generated an evaluated value.
export interface GeneratedValue {
    value: EvaluatedValue
}

// LazyValue The opcode execution returned a lazy value.
export interface LazyValue {
    lazy: MemoryValue
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

    // iterable The values to run the reducer over.
    //   This must be a memory cell of iterable type.
    iterable: MemoryValue

    // initialValue The value passed to the opcode if there are not enough values to perform a reduction.
    //   If the iterator only contains zero or one element, this is passed as the first, and
    //   possibly the second, value to the opcode.
    initialValue: MemoryValue
}

// FunctionReducerValue A reducer that runs through a user function.
export interface FunctionReducerValue {
    // function The user function that will reduce the values.
    //   The value must be of VmCallableType.  Its argument
    //   must take only the keys included in this reducer value:
    //   ([firstValueKey]: value type, [secondValueKey]: value type, [contextKey?]: context type)
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
    //   possibly the second, value to the function.  The type must be the same as the
    //   first and second value types.
    initialValue: MemoryValue
}

// OpCodeResult The return value type for an opcode.
export type OpCodeResult = GeneratedError | GeneratedValue | ReducerValue | LazyValue

// isGeneratedError Type checker
export function isGeneratedError(value: OpCodeResult): value is GeneratedError {
    return typeof value === 'object' && isRuntimeError((<GeneratedError>value).error)
}
