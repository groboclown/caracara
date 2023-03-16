// A value in a cell in a runtime environment.

import { RuntimeSourcePosition } from '../../source'
import { MemoryCell, VmMemoryIndex } from './cell'

// NativeValue The value stored in VmNativeType cells.
//  This does not allow returning "null".  Should it?
export type NativeValue = object | number | string

// IterableValueVisitor visits each element in the value until the list ends or true is returned.
//   This visits the memory value, to allow for possibly lazy loaded values.
type IterableVisitor = (value: MemoryValue) => boolean

// IterableValue The value stored in VmIterableType cells.
export interface IterableValue {
    // forEach Pass each item in the iterable into the callback until the end of the list or true is returned.
    forEach(callback: IterableVisitor): void
    // reduce? map? size?
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

// CallableValue The value stored in VmCallableType cells.
//     Additionally, this is the function memory layout constructed
//     by the loader.
export interface CallableValue {
    readonly source: RuntimeSourcePosition
    // getMemoryCells Get all the memory cells.
    getMemoryCells(): { [index: VmMemoryIndex]: MemoryCell }

    // getMemoryCellAt Get the cell with the given index.
    getMemoryCellAt(index: VmMemoryIndex): MemoryCell | undefined
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
