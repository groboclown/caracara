// API for an Embedding System to define its own opcodes.

import { RuntimeError, ValidationProblem } from '../../errors'
import { isRuntimeError } from '../../errors/struct'
import { RuntimeSourcePosition } from '../../source'
import { EvaluatedValue, MemoryValue, OpCodeBoundTypes, VmOpCode } from '../memory-store'
import { VmType, VmGenericBindHint, VmGenericId, VmGenericRef } from '../type-system'
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

// EvaluationType The argument's evaluation state before invocation of an opcode.
export enum EvaluationKind {
    // evaluated The value has an evaluated value before invocation.
    //   For iterable or structure types, this means that all the values
    //   inside the structure are also evaluated.
    evaluated,
    // lazy The value may not be evaluated before invocation.
    lazy,
    // shallow_evaluation if the value is an iterable or structure, then the
    //   underlying items may not be evaluated.
    shallow_evaluation,
    // In the future, other types may be included, such as "indeterminate", which
    //   will allow for values to act as Promises for possible dynamic evaluation.
}


// OpCodeArgument An argument to the opcode.
export interface OpCodeArgument {
    // name Argument name.  Optional, for debugging help.
    name?: string

    // type The argument type.
    type: VmType | VmGenericRef

    // evaluation The kind of evaluation this argument requires.
    //   The EvaluationKind definition declares the possible values and their meaning.
    evaluation: EvaluationKind
}

// OpCodeResult The return value type for an opcode.
export type OpCodeResult = GeneratedError | GeneratedValue | ReducerValue | LazyValue

// isGeneratedError Type checker
export function isGeneratedError(value: OpCodeResult): value is GeneratedError {
    return typeof value === 'object' && isRuntimeError((<GeneratedError>value).error)
}

// OpCodeGenericBinding Details how to bind a type to a generic reference
export interface OpCodeGenericBinding {
    // id The identifier used by the opcode's typing for binding
    //   to this resolved type.
    id: VmGenericId

    // bindHint Required type of the bound value.
    bindHint: VmGenericBindHint,

    // fromArgumentIndex The argument index that contains the bound-to meta-type.
    //   This allows for a dynamic type binding.  The validator may put additional
    //   restrictions on the value.
    fromArgumentIndex?: number

    // keyedTypeArgumentIndex The argument index is the key of a structure which represents this value.
    //   That arugment index must be a VmKeyOfType.
    keyedTypeArgumentIndex?: number
}

// OpCodeFrame Specific instantiation of an opcode at load time or runtime.
//   At load time, the memory value args will only have a value if the source is constant.
//   At run time, an argument must have a value if the argument is marked as evaluated, and might
//     have a value if not forced to be evaluated.
export interface OpCodeFrame {
    source: RuntimeSourcePosition
    context: ScriptContext

    // args The ordered arguments for the opcode
    //   The value will be set if it's a constant, otherwise it is only guaranteed to have
    //     a value if it's run time and the argument is not "lazy" evaluated.
    args: MemoryValue[]

    // returnType The value type of the memory cell the evaluated answer will be associated with.
    returnType: VmType
    boundTypes: OpCodeBoundTypes
}


// OpCodeInstruction An opcode implementation for the interpreter to use.
export interface OpCodeInstruction {
    // source Where this opcode came from.
    readonly source: RuntimeSourcePosition

    // opcode The mnemonic used by the functions to refer to this opcode.
    readonly opcode: VmOpCode

    // generics The generic names that must be bound for the opcode to be used.
    //   These are referenced by the VmGenericRef values.
    readonly generics: OpCodeGenericBinding[]

    // argumentTypes The argument types accepted by this instruction.
    //   All arguments to the actual instruction take a memory value.
    //   Unlike user functions, instructions take a list of typed arguments.
    readonly argumentTypes: OpCodeArgument[]

    // returnType The exected return type from the opcode.
    readonly returnType: VmType | VmGenericRef

    // staticValidation Called at script load time to determine whether the arguments are valid.
    //   Standard type checking and value count is done automatically, so that isn't necessary.
    staticValidation(settings: OpCodeFrame): ValidationProblem[]

    // runtimeValidation Ensures the run time settings are valid for this opcode.
    //   This includes full inspection of the settings to ensure that, when evaluation is
    //   called, the settings will be in the right state.  The implementation should
    //   assume that the settings are passed as-is to the evaluation call.
    //   Separating these two calls allows for evaluation to be very quick, so that
    //   eventual optimizations could skip the runtime validation.
    runtimeValidation(settings: OpCodeFrame): ValidationProblem[]

    // evaluate Performs the value evaluation based on the arguments.
    //   Called when the run time settings are validated as correct.  As such, it
    //   can make assumptions about the values in order to make this call fast.
    evaluate(settings: OpCodeFrame): OpCodeResult

    // returnValidation Post-evaluation checking of the returned value.
    //   Optionally called in order to perform strict checking.
    //   Only called if the evaluate returns a GeneratedValue.
    returnValidation(settings: OpCodeFrame, value: EvaluatedValue): ValidationProblem[]
}
