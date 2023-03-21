// An empty structured type, that any other structured type is castable to.

import { RuntimeError, VM_BUG_NON_EVALUATED_VALUE, VM_MEMORY_TYPE_CONFUSION } from '../../errors'
import { createCoreSource, RuntimeSourcePosition } from '../../source'
import { EvaluatedValue, MemoryCell, MemoryValue, StructuredValue, VmMemoryIndex } from '../../vm-api/memory-store'
import { isVmStructuredType, VmStructuredType } from '../../vm-api/type-system'

export const ANY_STRUCT_TYPE: VmStructuredType = {
    source: createCoreSource('types.any-struct'),
    name: 'any-struct',
    stores: {},
}

export function isEvaluatedAnyStructure(value: EvaluatedValue): value is StructuredValue {
    return typeof value === 'object' && ! Array.isArray(value)
}

export function isMemoryCellAnyStructure(value: MemoryCell): boolean {
    return isVmStructuredType(value.type)
}

export function isMemoryValueAnyStructure(value: MemoryValue): boolean {
    return isMemoryCellAnyStructure(value.cell)
}

export interface AnyStructureRet {
    value: StructuredValue
}

export function extractMemoryValueAnyStructure(source: RuntimeSourcePosition, index: VmMemoryIndex, value: MemoryValue): AnyStructureRet | RuntimeError {
    if (value.memoized === undefined) {
        return {
            source,
            errorId: VM_BUG_NON_EVALUATED_VALUE,
            parameters: {
                index,
            },
        } as RuntimeError
    }
    if (!isMemoryValueAnyStructure(value)) {
        return {
            source,
            errorId: VM_MEMORY_TYPE_CONFUSION,
            parameters: {
                index,
                expected: ANY_STRUCT_TYPE.name,
                actual: value.cell.type.name,
            },
        } as RuntimeError
    }
    return {value: value.memoized as StructuredValue}
}
