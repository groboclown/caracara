// Declares the built-in string simple type.

import { ValidationProblem, VM_BUG_NON_EVALUATED_VALUE, VM_MEMORY_TYPE_CONFUSION } from '../../errors'
import { createCoreSource } from '../../source'
import { OpCodeFrame } from '../../vm-api/interpreter'
import { EvaluatedValue, MemoryCell, MemoryValue, NativeValue, VmMemoryIndex } from '../../vm-api/memory-store'
import { isVmNativeType, VmNativeType } from '../../vm-api/type-system'

export const STRING_TYPE: VmNativeType = {
    source: createCoreSource('types.string'),
    name: 'str',
    internalType: 'string',
    isType: (value: NativeValue): boolean => {
        return isEvaluatedString(value)
    },
}

// createEvaluatedString Create an evaluated value that is of STRING_TYPE.
export function createEvaluatedString(value: string): EvaluatedValue {
    return value
}

export function isEvaluatedString(value: EvaluatedValue): value is string {
    return typeof value === 'string'
}

export function isMemoryCellString(value: MemoryCell): boolean {
    return isVmNativeType(value.type) && value.type.internalType === STRING_TYPE.internalType
}

export function isMemoryValueString(value: MemoryValue): boolean {
    if (!isMemoryCellString(value.cell)) {
        return false
    }
    if (value.value === undefined) {
        // could be!
        return true
    }
    return isEvaluatedString(value.value)
}

// validateMemoryValueString Complete value type check and fetching
//   If requireEvaluation is true, then the value must not be 'undefined'.
export function validateMemoryValueString(
    settings: OpCodeFrame, index: VmMemoryIndex,
    requireEvaluation = true,
): ValidationProblem | null {
    const value = settings.args[index]
    if (value.value === undefined) {
        if (!requireEvaluation) {
            return null
        }
        return {
            source: settings.source,
            problemId: VM_BUG_NON_EVALUATED_VALUE,
            parameters: {
                index,
            },
        } as ValidationProblem
    }
    if (!isMemoryValueString(value)) {
        return {
            source: settings.source,
            problemId: VM_MEMORY_TYPE_CONFUSION,
            parameters: {
                index,
                expected: STRING_TYPE.name,
                actual: value.cell.type.name,
            },
        } as ValidationProblem
    }
    return null
}

// memoryValueAsString quickly extracts the string value from the memory value
//   Calling this requires that extractMemoryValueString does not return an error.
export function memoryValueAsString(value: MemoryValue): string {
    return value.value as string
}
