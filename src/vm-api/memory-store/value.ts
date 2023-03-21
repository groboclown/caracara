// A value in a cell in a runtime environment.
//   These represent the implementing system view of the interpreter state.

import { RuntimeSourcePosition } from '../../source'
import { StructuredKeyType } from '../type-system/categories'
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
//   Constructed with functions to allow flexible underlying implementations,
//   in particular to allow for conserving memory.  Uses a forEach call to allow
//   for easy looping over the values while making fast looping logic in the
//   implementations.
export interface IterableValue {
    // forEach Pass each item in the iterable into the callback until the end of the list or true is returned.
    //   If startIndex is given, then the iteration starts at that position.
    //   If endIndex is given, then the iteration stops at the position just before that index.
    //   startIndex MUST be <= endIndex, or this does nothing.
    forEach(callback: IterableVisitor): void
    forEach(callback: IterableVisitor, options: {
        startIndex?: number,
        endIndex?: number,
    }): void

    // get Get the value at the index.
    //   If the index is out of range, undefined is returned.
    get(index: number): MemoryValue | undefined

    // size The number of items in the iterable.
    size(): number

    // 'reduce' and 'map' are not explicitly here, as those are better
    //   handled through functional tools outside the opcode.
}

// KeyOfValue The value stored in VmKeyOfType cells.
export interface KeyOfValue {
    readonly key: StructuredKeyType
}

type StructuredItemVisitor = (
    key: StructuredKeyType, value: MemoryValue,
) => boolean

// StructuredValue The value stored in VmStructuredType calls.
//   Constructed with functions to allow for optimal memory implementations.
export interface StructuredValue {
    // keys Get an array of all the keys stored in this structured value.
    //   It must contain at least the same set of keys that the corresponding type provides,
    //   but could include more.
    keys(): StructuredKeyType[]

    // get Get the value of the key provided.
    //   Returns undefined if the key is not part of this structure.
    get(key: StructuredKeyType): MemoryValue | undefined

    // forEach Loop over the items (key and value) in this structure.
    forEach(callback: StructuredItemVisitor): void

    // contains Check if the key is included in this structure.
    //   Equivalent to calling: `get(key) !== undefined`, but
    //   makes explicit the intent of the caller.
    contains(key: StructuredKeyType): boolean
}

// CALLABLE_RETURN_MEMORY_INDEX Memory index number in the callable value that contains the returned value.
export const CALLABLE_RETURN_MEMORY_INDEX: VmMemoryIndex = 0

// CALLABLE_ARGUMENT_MEMORY_INDEX Memory index number in the callable value that contains the argument value.
export const CALLABLE_ARGUMENT_MEMORY_INDEX: VmMemoryIndex = 1

// CallableValue The value stored in VmCallableType cells.
//     Additionally, this is the function memory layout constructed
//     by the loader.
export interface CallableValue {
    // source Where the callable came from.
    //   This relates to the name of the callable.
    readonly source: RuntimeSourcePosition

    // cells: The layout of the callable function.
    //   The cells MUST contain the CALLABLE_RETURN_MEMORY_INDEX index
    //   and the CALLABLE_ARGUMENT_MEMORY_INDEX index,
    //   as that is the final return of this callable and the argument.  When the
    //   callable value is used in a CallingMemoryCell, the return
    //   cell type must align with the CallingMemoryCell type and the
    //   argument must align with its cell type.
    //   If a cell contains a memory index, it MUST refer to one of these
    //   cells' indicies.
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
    readonly memoized?: EvaluatedValue | undefined

    // If a "unspecified" evaluation method is eventually defined, then a future / promise
    //   will be made available as a value.
}
