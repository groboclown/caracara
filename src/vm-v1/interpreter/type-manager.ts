// The type store manager implementation.

import { ERROR__IMPL_DUPLICATE_TYPE, ERROR__USER__TYPE_MISMATCH, RuntimeError, VM_BUG_UNKNOWN_PRIMARY_TYPE } from "../../errors"
import { RuntimeSourcePosition } from "../../source"
import { isVmCallableType, isVmGenericRef, isVmIterableType, isVmKeyOfType, isVmNativeType, isVmStructuredType, TypeStore, TypeStoreManager, VmGenericRef, VmType } from "../../vm-api/type-system"

export class TypeStoreManagerImpl implements TypeStoreManager {
    private typeMap: {[name: string]: VmType}
    private typeStore: TypeStore

    constructor() {
        this.typeMap = {}
        this.typeStore = new InternalTypeStore(this.typeMap)
    }

    getTypeStore(): TypeStore {
        return this.typeStore
    }

    addType(type: VmType): RuntimeError | null {
        if (this.typeMap[type.name] === type) {
            // identical entry.  Keep it and this is fine.
            return null
        }
        if (this.typeMap[type.name] !== undefined) {
            return {
                source: type.source,
                errorId: ERROR__IMPL_DUPLICATE_TYPE,
                parameters: {
                    type: type.name,
                },
            } as RuntimeError
        }
        this.typeMap[type.name] = type
        return null
    }
}


class InternalTypeStore implements TypeStore {
    private typeMap: {[name: string]: VmType}
    private typeCheckCache: {[keyPair: string]: RuntimeError | true} = {}

    constructor(typeMap: {[name: string]: VmType}) {
        this.typeMap = typeMap
    }

    getTypeNames(): string[] {
        return Object.keys(this.typeMap)
    }

    getTypeByName(name: string): VmType | undefined {
        return this.typeMap[name]
    }

    enforceTypeMatch(
        requestor: RuntimeSourcePosition, actual: VmType, expected: VmType,
    ): RuntimeError | null {
        const ret = innerTypeMatch(requestor, expected, actual, this.typeCheckCache)
        if (ret !== true) {
            ret.parameters = {
                ...(ret.parameters || {}),
                checkedExpected: expected.name,
                checkedActual: actual.name,
            }
            return ret
        }
        return null
    }
}

// innerTypeMatch Is the actual type of the given expected type?
//   Note that this is recursive.
//   Also note that the alreadyChecked cache is only used for checking
//   recursive types, to save on memory.
function innerTypeMatch(
    source: RuntimeSourcePosition,
    expected: VmType, actual: VmType,
    alreadyChecked: {[typePair: string]: RuntimeError | true},
): RuntimeError | true {
    // Rules of types:
    //   - The name is unique.  So if the names are the same, then it's the
    //     same type.
    //   - For types to be matchable, they must both be of the same top-level type.
    //     (simple, iterable, structured, or callable).
    //   - For types containing other types, recursive definitions are assumed to
    //     be the same.
    //        Example:
    //           Node: { left: Node, right: Node } is one type.
    //           Directions: { left: Directions, right: Directions } is another type.
    //           They would be considered equivalent. when left and right are checked,
    //             they are on a type that's already being checked, and they're checked
    //             against the same type.
    //   - For simple types, the internal type name must be the same.
    //   - For iterable types, the value types must be the same.
    //     (If these ever include length in the type, then it must also match.
    //     Note that length in the type is very different from length in the value,
    //     where one has a static length and the other has a variable length.)
    //   - For structured types, the system uses prototyping.  Therefore, the
    //     actual type must have all the keys with equivalent types as the expected
    //     type.
    //   - For callable types, the call signatures must match.  That means the
    //     both must match their arguments type and their return type.

    // Implementation note: the error returned by createTypeMismatchError can
    //   have the parameters amended, but recursive calls into innerTypeMatch
    //   must never be augmented; that's due to possible bubbling up overwriting
    //   the source's original values.

    // ==============================================
    //   - The name is unique.  So if the names are the same, then it's the
    //     same type.
    if (expected.name === actual.name) {
        // Don't cache this match.  It's simple and fast and would otherwise
        // just waste memory.
        return true
    }


    // ==============================================
    //   - For types to be matchable, they must both be of the same top-level type.
    //     (simple, iterable, structured, or callable).

    // alreadyChecked is a mutable type that is added to.  This prevents
    //   needing to recheck all the pairs in a search.
    //   The key is the value "(actual)!(expected)".  The value is always true or undefined.

    const key = `${actual.name}!${expected.name}`
    if (alreadyChecked[key] !== undefined) {
        // This was already checked, or previously tried to be checked and
        //   recursion led us back here.
        return alreadyChecked[key]
    }

    // Mark the pair as checked.  This prevents while-visiting recursion from
    //   causing an infinite loop.  The default is that they're equal.
    alreadyChecked[key] = true
    // In the case of a check returning false, all further checking is halted and false
    //   is returned, so there's no need to change it if a false is detected.  That would
    //   be useful if we want to cache these checks in memory for future validation speedups.

    //   - For types to be matchable, they must both be of the same top-level type.
    //     (simple, iterable, structured, or callable).

    if (isVmNativeType(actual)) {
        if (!isVmNativeType(expected)) {
            // Not recursive - don't cache the answer.
            return createTypeMismatchError(source, expected, actual)
        }
        //   - For simple types, the internal type name must be the same.
        if (actual.internalType !== expected.internalType) {
            // Not recursive - don't cache the answer.
            return createTypeMismatchError(source, expected, actual)
        }
        // The native types reference the same internal type.  They're the same type.
        // Not recursive - don't cache the answer.
        return true
    }

    if (isVmKeyOfType(actual)) {
        if (!isVmKeyOfType(expected)) {
            // Not recursive - don't cache the answer.
            return createTypeMismatchError(source, expected, actual)
        }
        // This call caches any recrusive stuff.
        return matchMaybeGenericTypes(source, expected.structureSource, actual.structureSource, key, alreadyChecked)
    }

    if (isVmIterableType(actual)) {
        if (!isVmIterableType(expected)) {
            // Not recursive - don't cache the answer.
            return createTypeMismatchError(source, expected, actual)
        }
        //   - For iterable types, the value types must be the same.
        // This call caches any recrusive stuff.
        return matchMaybeGenericTypes(source, expected.valueType, actual.valueType, key, alreadyChecked)
    }

    if (isVmStructuredType(actual)) {
        if (!isVmStructuredType(expected)) {
            return createTypeMismatchError(source, expected, actual)
        }
        //   - For structured types, the system uses prototyping.  Therefore, the
        //     actual type must have all the keys with equivalent types as the expected
        //     type.
        // Though this isn't recursing, it's looping, which is complex.  So save off the result.
        for (const key of Object.keys(expected.stores)) {
            const actualKey = actual.stores[key]
            if (actualKey === undefined) {
                // actual doesn't define this key.  It's incompatible.
                // Augment the error message with the specifics.
                const ret = createTypeMismatchError(source, expected, actual)
                ret.parameters = {
                    ...(ret.parameters || {}),
                    missingKey: key,
                    missingKeyType: expected.stores[key].valueType.name,
                }
                alreadyChecked[key] = ret
                return ret
            }
            const keyTypeMatch = innerTypeMatch(source, expected.stores[key].valueType, actualKey.valueType, alreadyChecked)
            if (keyTypeMatch !== true) {
                // Do not augment the returned value.
                // And cache it.
                alreadyChecked[key] = keyTypeMatch
                return keyTypeMatch
            }
        }
        // The actual may have more keys, but that's okay.
        alreadyChecked[key] = true
        return true
    }

    if (isVmCallableType(actual)) {
        if (!isVmCallableType(expected)) {
            // Don't cache.
            return createTypeMismatchError(source, expected, actual)
        }
        // check return type
        // This caches any recursion.
        const returnMatch = matchMaybeGenericTypes(source, expected.returnType, actual.returnType, key, alreadyChecked)
        if (returnMatch !== true) {
            return returnMatch
        }

        // check arguments type
        //   It's the last thing to check for this type, so just return it directly.
        //   This caches any recursion.
        return matchMaybeGenericTypes(source, expected.argumentTypes, actual.argumentTypes, key, alreadyChecked)
    }

    // Invalid state.
    return {
        source,
        errorId: VM_BUG_UNKNOWN_PRIMARY_TYPE,
        parameters: {
            actual: actual.name,
        }
    } as RuntimeError
}

// matchMaybeGenericTypes A maybe-deep check of a referenced type.
function matchMaybeGenericTypes(
    source: RuntimeSourcePosition,
    deepExpected: VmType | VmGenericRef,
    deepActual: VmType | VmGenericRef,
    key: string,
    alreadyChecked: {[typePair: string]: RuntimeError | true},
) {
    if (isVmGenericRef(deepExpected) || isVmGenericRef(deepActual)) {
        // Not a recursive call, so don't save off the results.
        return matchGenericRef(source, deepExpected, deepActual)
    }
    // Need to recurse, so save off the result.
    const res = innerTypeMatch(source, deepExpected, deepActual, alreadyChecked)
    alreadyChecked[key] = res
    return res
}

// createTypeMismatchError Create a type mismatch error.
function createTypeMismatchError(source: RuntimeSourcePosition, expected: VmType, actual: VmType): RuntimeError {
    return {
        source,
        errorId: ERROR__USER__TYPE_MISMATCH,
        parameters: {
            expected: expected.name,
            actual: actual.name,
        }
    } as RuntimeError
}

// createTypeMismatchError Create a type mismatch error.
function createGenericRefMismatchError(source: RuntimeSourcePosition, expected: VmType | VmGenericRef, actual: VmType | VmGenericRef): RuntimeError {

    return {
        source,
        errorId: ERROR__USER__TYPE_MISMATCH,
        parameters: {
            expected: getTypeName(expected),
            actual: getTypeName(actual),
        }
    } as RuntimeError
}

// getTypeName Get the name of the type, or a stringified version of the generic reference.
function getTypeName(type: VmType | VmGenericRef): string {
    return isVmGenericRef(type) ? `Generic<${type.genericId}:${type.bindHint}>` : type.name
}

//  matchGenericRef Match generic refs, if expected or actual are generic.
function matchGenericRef(source: RuntimeSourcePosition, expected: VmType | VmGenericRef, actual: VmType | VmGenericRef): RuntimeError | true {
    if (!isVmGenericRef(actual) || !isVmGenericRef(expected)) {
        return createGenericRefMismatchError(source, expected, actual)
    }
    // the ref ID must be the same.  It just does.
    if (expected.genericId !== actual.genericId || expected.bindHint !== actual.bindHint) {
        return createGenericRefMismatchError(source, expected, actual)
    }
    return true
}

