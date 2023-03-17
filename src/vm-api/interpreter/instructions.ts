// API for an Embedding System to define its own opcodes.

import { OpCodeResult } from '../memory-store/returns'
import { ValidationProblem } from '../../errors'
import { RuntimeSourcePosition } from '../../source'
import { EvaluatedValue, MemoryValue, OpCodeBoundTypes, MemoryFactory, VmOpCode } from '../memory-store'
import { VmType, VmGenericBindHint, VmGenericId, VmGenericRef } from '../type-system'
import { ScriptContext } from './loaded-script'

// EvaluationKind The argument's evaluation state before invocation of an opcode.
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
    evaluate(settings: OpCodeFrame, factory: MemoryFactory): OpCodeResult

    // returnValidation Post-evaluation checking of the returned value.
    //   Optionally called in order to perform strict checking.
    //   Only called if the evaluate returns a GeneratedValue.
    returnValidation(settings: OpCodeFrame, value: EvaluatedValue): ValidationProblem[]
}
