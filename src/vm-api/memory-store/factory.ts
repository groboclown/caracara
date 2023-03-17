// Factory for opcodes to generate memory values.
// Because the complex memory values are stored efficiently in the VM,
//   the data values must be managed by the VM, not the opcode.

import { VmType } from "../type-system"
import { EvaluatedValue, MemoryValue } from "./value"
import { GeneratedValue, LazyValue, GeneratedError } from './returns'
import { StructuredKeyType } from "../type-system/categories"

// MemoryFactory Constructs iterable and structure evaluated values.
//   The factory is valid only for the context that receives it.
export interface MemoryFactory {
    // iterable Generates iterables
    readonly iterable: IterableFactory

    // structure Generates structures
    readonly structure: StructureFactory

    // call Generates memory that is populated from a call
    readonly call: CallFactory
}

// NOTE: these factories would benefit greatly by having explicit
//   MemoryValue typing to declare whether the cell type is of
//   a required value.

// NOTE: Implementations must take care with constructions that
//   create new memory cells.  If the returned value isn't returned
//   by the opcode, then the allocated memory cells will need to
//   be cleaned up.  Likewise, if EvaluatedValue construction must be
//   managed, then it too must be cleaned up.  This implementation
//   assumes a garbage collector will clean up the EvaluatedValue
//   instances when they go out of scope.

// FactoryValue An evaluated value or an error.
export type FactoryValue = GeneratedValue | GeneratedError

// FactoryMemory A constructed memory value with a cell.
export type FactoryMemory = LazyValue | GeneratedError

// StructureFactory Generates new structures.
export interface StructureFactory {
    // createFromMemory Creates a new structure of the given type for the memory values.
    //   The type must be the structure type.
    //   If the types don't align, then a GeneratedError is returned.
    createFromMemory(
        value: {[name: StructuredKeyType]: MemoryValue},
        type: VmType,
    ): FactoryValue

    // createFromValues Creates a new structure of the given type for the evaluated values.
    //   The type must be the structure type.
    //   If the types don't align, then a GeneratedError is returned.
    createFromValues(
        value: {[name: StructuredKeyType]: EvaluatedValue},
        type: VmType,
    ): FactoryValue
}

// IterableFactory Generates new iterables.
//   This factory breaks the non-indexable requirement around iterables,
//   as in many cases, working with indicies
export interface IterableFactory {
    // createFromArray Creates a new iterable from an array of memory values.
    //   The values must all have a compatible type as the argument, or a GeneratedError is
    //   returned.
    createFromMemoryArray(values: MemoryValue[], type: VmType): FactoryValue

    // createFromValueArray Creates a new iterable of a given type from an array of evaluated values.
    //   The type must be the iterable type.
    //   This constructs dynamic memory cells.
    //   This can return a GeneratedError if the value types aren't right.
    createFromValueArray(values: EvaluatedValue[], type: VmType): FactoryValue

    // append Add a new value to the end of the iterable, and return a new iterable
    //   'iterable' must be a memory cell with an iterable type,
    //   and 'appended' must be a memory cell with a type matching the iterable's item type.
    //   If the iterable isn't a list, or the appended value isn't of the right type,
    //   a GeneratedError is returned.
    append(iterable: MemoryValue, appended: MemoryValue): FactoryValue

    // replace Replace a value at an index with another value.
    //   'iterable' must be a memory cell with an iterable type,
    //   and 'replaceWith' must be a memory cell with a type matching the iterable's item type.
    //   If the index is negative, then the replace-with is from the end of the list (size + index).
    //   If the index is greater than the length of the list, a GeneratedError is returned.
    //   If the types don't align, then a GeneratedError is returned.
    replace(iterable: MemoryValue, index: number, replaceWith: MemoryValue): FactoryValue

    // sub Return a sub-range of values from an iterable
    sub(iterable: MemoryValue, start: number, end: number): FactoryValue

    // splice Merge iterables together.
    //   Inserts the second iterable into the first iterable at the insertAt position.
    insertIterable(
        first: MemoryValue,
        second: MemoryValue,
        insertAt: number,
    ): FactoryValue
}

// CallableFactory Generates calls as memory.
export interface CallFactory {
    // createCall Creates a new memory cell that will be evaluated to the result of the callable.
    //   The callable must be of VmCallableType.  The argument must be compatible with the
    //   callable's argument type.
    createCall(
        callable: MemoryValue,
        argument: MemoryValue,
    ): FactoryMemory
}
