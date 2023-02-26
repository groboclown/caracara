// Declares the built-in integer simple type.

import { RuntimeError, VM_BUG_NON_EVALUATED_VALUE, VM_MEMORY_TYPE_CONFUSION } from '../../errors'
import { createCoreSource, RuntimeSourcePosition } from '../../source'
import { EvaluatedValue, MemoryCell, MemoryValue, VmMemoryIndex } from '../../vm-api/memory-store'
import { isVmNativeType, VmNativeType } from '../../vm-api/type-system'

export const INTEGER_TYPE: VmNativeType = {
    source: createCoreSource('types.integer'),
    name: 'int',
    internalType: 'integer',
}

export function isEvaluatedInteger(value: EvaluatedValue): value is number {
    return typeof value === 'number' && ((value | 0) === value)
}

export function isMemoryCellInteger(value: MemoryCell): boolean {
    return isVmNativeType(value.type) && value.type.internalType === INTEGER_TYPE.internalType
}

export function isMemoryValueInteger(value: MemoryValue): boolean {
    if (!isMemoryCellInteger(value.cell)) {
        return false
    }
    if (value.value === undefined) {
        // could be!
        return true
    }
    return isEvaluatedInteger(value.value)
}

export function extractMemoryValueInteger(source: RuntimeSourcePosition, index: VmMemoryIndex, value: MemoryValue): number | RuntimeError {
    if (value.value === undefined) {
        return {
            source,
            errorId: VM_BUG_NON_EVALUATED_VALUE,
            parameters: {
                index,
            },
        } as RuntimeError
    }
    if (!isMemoryValueInteger(value)) {
        return {
            source,
            errorId: VM_MEMORY_TYPE_CONFUSION,
            parameters: {
                index,
                expected: INTEGER_TYPE.name,
                actual: value.cell.type.name,
            },
        } as RuntimeError
    }
    return (value.value as number) | 0
}

export const NUMBER_TYPE: VmNativeType = {
    source: createCoreSource('types.number'),
    name: 'number',
    internalType: 'number',
}

export function IsEvaluatedNumber(value: EvaluatedValue): value is number {
    return typeof value === 'number'
}

export function isMemoryCellNumber(value: MemoryCell): boolean {
    return isVmNativeType(value.type) && value.type.internalType === NUMBER_TYPE.internalType
}

export function isMemoryValueNumber(value: MemoryValue): boolean {
    if (!isMemoryCellNumber(value.cell)) {
        return false
    }
    if (value.value === undefined) {
        // could be!
        return true
    }
    return IsEvaluatedNumber(value.value)
}

export function extractMemoryValueNumber(source: RuntimeSourcePosition, index: VmMemoryIndex, value: MemoryValue): number | RuntimeError {
    if (value.value === undefined) {
        return {
            source,
            errorId: VM_BUG_NON_EVALUATED_VALUE,
            parameters: {
                index,
            },
        } as RuntimeError
    }
    if (!isMemoryValueNumber(value)) {
        return {
            source,
            errorId: VM_MEMORY_TYPE_CONFUSION,
            parameters: {
                index,
                expected: NUMBER_TYPE.name,
                actual: value.cell.type.name,
            },
        } as RuntimeError
    }
    return value.value as number
}
