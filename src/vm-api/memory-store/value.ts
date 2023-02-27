// A value in a cell in a runtime environment.

import { RuntimeSourcePosition } from '../../source'
import { MemoryCell, VmMemoryIndex } from './cell'

// NativeValue The value stored in VmNativeType cells.
//  This does not allow returning "null".  Should it?
export type NativeValue = object | number | string

type IterableVisitor = (value: EvaluatedValue) => void

// IterableValue The value stored in VmIterableType cells.
//   In order for an iterable value to be evaluated, all its
//   items must be evaluated.  This is a non-lazy approach.
//   This may change in the future.
export interface IterableValue {
    forEach(callback: IterableVisitor): void
    // reduce? map? size?
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
export type EvaluatedValue = NativeValue | IterableValue | StructuredValue | CallableValue

// MemoryValue The runtime memory cell and its (possibly) evaluated value.
export interface MemoryValue {
    // cell The memory cell definition
    readonly cell: MemoryCell

    // value The memoized / evaluated value of the cell, or not set if not evaluated yet.
    readonly value?: EvaluatedValue | undefined
}
