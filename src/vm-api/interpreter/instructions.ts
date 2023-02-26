// API for an Embedding System to define its own opcodes.

import { RuntimeError, ValidationProblem } from '../../errors'
import { RuntimeSourcePosition } from '../../source'
import { EvaluatedValue, MemoryCell, MemoryValue, VmOpCode } from '../memory-store'
import { VmType } from '../type-system'
import { ScriptContext } from './loaded-script'

export interface GeneratedError {
    error: RuntimeError
}

export interface GeneratedValue {
    value: EvaluatedValue
}

export interface RequiresArgumentEvaluation {
    requires: MemoryValue[]
}

export type OpCodeResult = GeneratedError | GeneratedValue | RequiresArgumentEvaluation


// OpCodeImpl An opcode implementation for the interpreter to use.
export interface OpCodeInstruction {
    // source Where this opcode came from.
    readonly source: RuntimeSourcePosition

    // opcode The mnemonic used by the functions to refer to this opcode.
    readonly opcode: VmOpCode

    // argumentTypes The argument types accepted by this instruction.
    //   All arguments to the actual instruction take a memory value.
    //   Unlike user functions, instructions take a list of typed arguments.
    //   If lazy evaluation is desired, this may need to change to allow for
    //   specifying details for just how lazy it needs to be.
    readonly argumentTypes: VmType[]

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
    //   
    evaluate(
        source: RuntimeSourcePosition,
        context: ScriptContext,
        args: MemoryValue[],
        returnType: VmType,
    ): OpCodeResult
}
