// Helpers for the interpreter's keyof type.

import { RuntimeError, VM_BUG_NON_EVALUATED_VALUE, VM_MEMORY_TYPE_CONFUSION } from '../../errors'
import { RuntimeSourcePosition } from '../../source'
import { EvaluatedValue, MemoryCell, MemoryValue, VmMemoryIndex } from '../../vm-api/memory-store'
import { isVmKeyOfType, VmStructuredType } from '../../vm-api/type-system'

// keyof type is stored just as a string.

export function isEvaluatedKeyOf(value: EvaluatedValue): value is string {
    return typeof value === 'string'
}

export function isMemoryCellKeyOf(value: MemoryCell): boolean {
    return isVmKeyOfType(value.type)
}

export function isMemoryValueKeyOf(value: MemoryValue): boolean {
    if (!isMemoryCellKeyOf(value.cell)) {
        return false
    }
    if (value.value === undefined) {
        // could be!
        return true
    }
    return isEvaluatedKeyOf(value.value)
}

export function isKeyOfStructure(name: string, type: VmStructuredType): boolean {
    return type.stores[name] !== undefined
}

export function extractMemoryValueKeyOf(source: RuntimeSourcePosition, index: VmMemoryIndex, value: MemoryValue): string | RuntimeError {
    if (value.value === undefined) {
        return {
            source,
            errorId: VM_BUG_NON_EVALUATED_VALUE,
            parameters: {
                index,
            },
        } as RuntimeError
    }
    if (!isMemoryValueKeyOf(value)) {
        return {
            source,
            errorId: VM_MEMORY_TYPE_CONFUSION,
            parameters: {
                index,
                expected: 'keyof',
                actual: value.cell.type.name,
            },
        } as RuntimeError
    }

    return value.value as string
}
