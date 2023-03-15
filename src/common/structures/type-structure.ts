// Declares the built-in structure type.

import { RuntimeError, VM_BUG_NON_EVALUATED_VALUE, VM_MEMORY_TYPE_CONFUSION } from '../../errors'
import { createCoreSource, RuntimeSourcePosition } from '../../source'
import { EvaluatedValue, MemoryCell, MemoryValue, VmMemoryIndex } from '../../vm-api/memory-store'
import { isVmNativeType, VmNativeType } from '../../vm-api/type-system'

export const STRING_TYPE: VmNativeType = {
    source: createCoreSource('types.string'),
    name: 'str',
    internalType: 'string',
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

export function extractMemoryValueString(source: RuntimeSourcePosition, index: VmMemoryIndex, value: MemoryValue): string | RuntimeError {
    if (value.value === undefined) {
        return {
            source,
            errorId: VM_BUG_NON_EVALUATED_VALUE,
            parameters: {
                index,
            },
        } as RuntimeError
    }
    if (!isMemoryValueString(value)) {
        return {
            source,
            errorId: VM_MEMORY_TYPE_CONFUSION,
            parameters: {
                index,
                expected: STRING_TYPE.name,
                actual: value.cell.type.name,
            },
        } as RuntimeError
    }
    return value.value as string
}
