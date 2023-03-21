// Storage for the types present in the loaded script.

import { RuntimeError } from '../../errors'
import { RuntimeSourcePosition } from '../../source'
import { VmType } from './categories'

// TypeStore Access the static types in the current interpreter scope.
export interface TypeStore {
    // getTypeNames Get the names of all the types stored.
    getTypeNames(): string[]

    // getTypeByName Get the registered type with the given name.
    //    Returns undefined if there is no such type.
    getTypeByName(name: string): VmType | undefined

    // enforceTypeMatch Enforce that the actual value type matches the expected type.
    //    Returns either an error, if the actual type does not conform to the expected type,
    //    or null, if it is fine,
    //    Implementations may cache some evaluations in order to speed up future checks.
    //    If the expected type is not passed, then the type store loads the corresponding name from
    //    the internal store and compares against that.
    enforceTypeMatch(requestor: RuntimeSourcePosition, actual: VmType, expected?: VmType): RuntimeError | null
}

// TypeStoreManager manages the construction of the type store.
export interface TypeStoreManager {
    // getTypeStore retrieve a read-only view of the type store.
    getTypeStore(): TypeStore

    // addType Add a new type to the system.
    //    Returns an error if the type already exists and is not the same value.
    //    Adding duplicate identical type instances is okay.
    addType(type: VmType): RuntimeError | null
}
