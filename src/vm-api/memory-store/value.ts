// A value in a cell in a runtime environment.
//   These represent the implementing system view of the interpreter state.

import { RuntimeSourcePosition } from '../../source'
import { MemoryCell, VmMemoryIndex } from './cell'

// NativeValue The value stored in VmNativeType cells.
//  This does not allow returning "null".  Should it?
export type NativeValue = object | number | string | boolean

// IterableValueVisitor visits each element in the value until the list ends or true is returned.
//   This visits the memory value, to allow for possibly lazy loaded values.
type IterableVisitor = (
    value: MemoryValue, extra: {
        index: number,
        first: boolean,
        last: boolean,
    },
) => boolean

// IterableValue The value stored in VmIterableType cells.
export interface IterableValue {
    // forEach Pass each item in the iterable into the callback until the end of the list or true is returned.
    //   If startIndex is given, then the iteration
    forEach(callback: IterableVisitor): void
    forEach(callback: IterableVisitor, options: {
        startIndex?: number,
        endIndex?: number,
    }): void

    // size The number of items in the iterable.
    size(): number

    // 'reduce' and 'map' are not explicitly here, as those are better
    //   handled through functional tools outside the opcode.
}

// KeyOfValue The value stored in VmKeyOfType cells.
export interface KeyOfValue {
    readonly key: string
}

// StructuredValue The value stored in VmStructuredType calls.
//   In order for a structured value to be evaluated, all its
//   keys' values must be evaluated.  This is a non-lazy approach.
//   This may change in the future.
export interface StructuredValue {
    readonly store: { [key: string]: EvaluatedValue }
}

export const CALLABLE_RETURN_MEMORY_INDEX: VmMemoryIndex = 0

// CallableValue The value stored in VmCallableType cells.
//     Additionally, this is the function memory layout constructed
//     by the loader.
export interface CallableValue {
    // source Where the callable came from.
    //   This relates to the name of the callable.
    readonly source: RuntimeSourcePosition

    // cells: The layout of the callable function.
    //   The cells MUST contain the CALLABLE_RETURN_MEMORY_INDEX index,
    //   as that is the final return of this callable.  When the
    //   callable value is used in a CallingMemoryCell, the return
    //   cell type must align with the CallingMemoryCell type.
    readonly cells: {[index: VmMemoryIndex]: MemoryCell}
}

// EvaluatedValue The value stored in a memory cell after it has been evaluated.
//   The type of the evaluated value passed to an opcode is guaranteed to be of the
//   source type.
export type EvaluatedValue = NativeValue | IterableValue | StructuredValue | KeyOfValue | CallableValue

// MemoryValue The runtime memory cell and its (possibly) evaluated value.
export interface MemoryValue {
    // cell The memory cell definition
    readonly cell: MemoryCell

    // value The memoized / evaluated value of the cell, or not set if not evaluated yet.
    readonly value?: EvaluatedValue | undefined

    // If a "unspecified" evaluation method is eventually defined, then a future / promise
    //   will be made available as a value.
}
