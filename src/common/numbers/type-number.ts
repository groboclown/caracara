// Declares the built-in integer simple type.

import { ValidationProblem, VM_BUG_NON_EVALUATED_VALUE, VM_MEMORY_TYPE_CONFUSION } from '../../errors'
import { createCoreSource } from '../../source'
import { OpCodeFrame } from '../../vm-api/interpreter'
import { EvaluatedValue, MemoryCell, MemoryValue, NativeValue, VmMemoryIndex } from '../../vm-api/memory-store'
import { isVmNativeType, VmIterableType, VmNativeType } from '../../vm-api/type-system'

export const INTEGER_TYPE: VmNativeType = {
    source: createCoreSource('types.integer'),
    name: 'int',
    internalType: 'integer',
    isType: (value: NativeValue): boolean => {
        return isEvaluatedInteger(value)
    },
}

export const INTEGER_ITERABLE_TYPE: VmIterableType = {
    source: createCoreSource('types.integer'),
    name: 'list(int)',
    valueType: INTEGER_TYPE,
}

// createEvaluatedInteger Create an evaluated value that is of INTEGER_TYPE.
export function createEvaluatedInteger(value: number): EvaluatedValue {
    return value | 0
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
    if (value.memoized === undefined) {
        // could be!
        return true
    }
    return isEvaluatedInteger(value.memoized)
}

// validateMemoryValueInteger Ensure the value is an integer
export function validateMemoryValueInteger(
    settings: OpCodeFrame,
    index: VmMemoryIndex,
    requiresEvaluation = true,
): ValidationProblem | null {
    const value = settings.args[index]
    if (value.memoized === undefined) {
        if (!requiresEvaluation) {
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
    if (!isMemoryValueInteger(value)) {
        return {
            source: settings.source,
            problemId: VM_MEMORY_TYPE_CONFUSION,
            parameters: {
                index,
                expected: INTEGER_TYPE.name,
                actual: value.cell.type.name,
            },
        } as ValidationProblem
    }
    return null
}

// memoryValueAsInteger Quick value extraction.
export function memoryValueAsInteger(value: MemoryValue): number {
    return (value.memoized as number) | 0
}

// NUMBER_TYPE A floating point number
export const NUMBER_TYPE: VmNativeType = {
    source: createCoreSource('types.number'),
    name: 'number',
    internalType: 'number',
    isType: (value: NativeValue): boolean => {
        return isEvaluatedNumber(value)
    },
}

export const NUMBER_ITERABLE_TYPE: VmIterableType = {
    source: createCoreSource('types.number'),
    name: 'list(number)',
    valueType: NUMBER_TYPE,
}

// createEvaluatedNumber Create an evaluated value that is of NUMBER_TYPE.
export function createEvaluatedNumber(value: number): EvaluatedValue {
    return value
}

export function isEvaluatedNumber(value: EvaluatedValue): value is number {
    return typeof value === 'number'
}

export function isMemoryCellNumber(value: MemoryCell): boolean {
    return isVmNativeType(value.type) && value.type.internalType === NUMBER_TYPE.internalType
}

export function isMemoryValueNumber(value: MemoryValue): boolean {
    if (!isMemoryCellNumber(value.cell)) {
        return false
    }
    if (value.memoized === undefined) {
        // could be!
        return true
    }
    return isEvaluatedNumber(value.memoized)
}

export function validateMemoryValueNumber(
    settings: OpCodeFrame,
    index: VmMemoryIndex,
    requiresEvaluation = true,
): ValidationProblem | null {
    const value = settings.args[index]
    if (value.memoized === undefined) {
        if (!requiresEvaluation) {
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
    if (!isMemoryValueNumber(value)) {
        return {
            source: settings.source,
            problemId: VM_MEMORY_TYPE_CONFUSION,
            parameters: {
                index,
                expected: NUMBER_TYPE.name,
                actual: value.cell.type.name,
            },
        } as ValidationProblem
    }
    return null
}

// memoryValueAsNumber Quick value extraction.
export function memoryValueAsNumber(value: MemoryValue): number {
    return value.memoized as number
}
