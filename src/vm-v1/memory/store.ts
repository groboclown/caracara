// Memory manager for running in a local "stack".

import { ValidationResult } from '../../errors/struct'
import { RuntimeSourcePosition } from '../../source'
import { EvaluatedValue, MemoryFactory } from '../../vm-api/memory-store'
import { ConstantRefMemoryCell, MemoryCell } from '../../vm-api/memory-store/cell'
import { InternalMemoryValue } from './memory-value'

// MemoryValueAdder Adds memory values to a store.
export interface MemoryValueAdder {
    // addMemoryValue Adds the memory value into the underlying store.
    //   Can only be called from internal VM places, so we assume that the value is of the correct type.
    //   The value can be undefined if the value hasn't been evaluated yet.
    addMemoryValue(
        source: RuntimeSourcePosition,
        cell: MemoryCell,
        value: EvaluatedValue | undefined,
        isConstant?: boolean
    ): ValidationResult<InternalMemoryValue>
}

// MemoryStore A view on top of the indexable memory space.
export interface MemoryStore {
    // count Number of memory slots.
    count(): number

    // get Get the memory at the index.
    get(index: number): InternalMemoryValue | undefined

    // lookupConstIdIndex Lookup the constant by identifier
    lookupConstIdIndex(constId: string): number | undefined

    // lookupConstIndex Lookup the constant by name
    lookupConstIndex(module: string, constant: string): number | undefined

    getConstIdByName(module: string, constant: string): string

    getConstIdByRef(ref: ConstantRefMemoryCell): string
}

// MemoryFront A front-end to all your memory needs.
export interface MemoryFront extends MemoryFactory {
    // store The memory store repository.
    readonly store: MemoryStore

    // adder The memory value adder.
    readonly adder: MemoryValueAdder
}
