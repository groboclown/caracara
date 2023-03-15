// Concatenate two strings together.

import { ValidationProblem } from '../../errors'
import { isRuntimeError } from '../../errors/struct'
import { createCoreSource, RuntimeSourcePosition } from '../../source'
import { OpCodeInstruction, ScriptContext } from '../../vm-api/interpreter'
import { EvaluationKind, GeneratedError, GeneratedValue, OpCodeResult } from '../../vm-api/interpreter/instructions'
import { MemoryValue, VmOpCode } from '../../vm-api/memory-store'
import { extractMemoryValueString, STRING_TYPE } from './type-string'

// OPCODE__ADD_NUMBERS opcode for this operation.
export const OPCODE__CONCAT_STRINGS: VmOpCode = 'concat'

// OpCodeAddNumbers Add two numbers together.
export class OpCodeConcatStrings implements OpCodeInstruction {
    readonly source: RuntimeSourcePosition
    readonly opcode = OPCODE__CONCAT_STRINGS
    readonly argumentTypes = [
        {
            name: "first",
            type: STRING_TYPE,
            evaluation: EvaluationKind.evaluated,
        },
        {
            name: "second",
            type: STRING_TYPE,
            evaluation: EvaluationKind.evaluated,
        },
    ]
    readonly returnType = STRING_TYPE
    readonly generics = []

    constructor() {
        this.source = createCoreSource('core.strings.concat')
    }

    validate(): ValidationProblem[] {
        // No additional checks necessary beyond the arugment count and type checks.
        return []
    }

    evaluate(
        source: RuntimeSourcePosition,
        _context: ScriptContext, args: MemoryValue[],
    ): OpCodeResult {
        const arg0 = extractMemoryValueString(source, 0, args[0])
        if (isRuntimeError(arg0)) {
            return { error: arg0 } as GeneratedError
        }
        const arg1 = extractMemoryValueString(source, 1, args[1])
        if (isRuntimeError(arg1)) {
            return { error: arg1 } as GeneratedError
        }
        return {
            value: arg0 + arg1
        } as GeneratedValue
    }
}
