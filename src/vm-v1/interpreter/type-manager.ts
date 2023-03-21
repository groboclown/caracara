// The type store manager implementation.

import { ERROR__IMPL_UNKNOWN_TYPE, ERROR__USER__TYPE_MISMATCH, ERROR__USER__UNKOWN_TYPE, RuntimeError, VM_BUG_UNKNOWN_PRIMARY_TYPE } from "../../errors"
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
        const addedOrError = this.deepAdd(type)
        if (!Array.isArray(addedOrError)) {
            return addedOrError
        }
        addedOrError.forEach((newType) => {
            this.typeMap[newType.name] = newType
        })
        return null
    }

    // deepAdd Recursive check to see if the type is registered identically, and return all new types.
    //    If it's not registered, or its sub-types are not registered, then all those types are returned.
    //    This is done outside the addType call, because if any one of the types fails, then the
    //    whole add fails and none of them should be added (atomic operation).
    private deepAdd(addedType: VmType): RuntimeError | VmType[] {
        const alreadyChecked: {[typePair: string]: RuntimeError | true} = {}
        const stack: VmType[] = [addedType]
        const discovered: VmType[] = []
        const discoveredNames: {[name: string]: boolean} = {}

        // There is a lot of overlap between this and the compatibility checks.
        // TODO unify the compatibility check and this check.
        while (true) {
            const newType = stack.pop()
            if (newType === undefined) {
                break
            }
            if (alreadyChecked[newType.name] !== undefined) {
                // Don't infinitely recurse.
                continue
            }
            alreadyChecked[newType.name] = true

            // Simple checks.
            const existingType = this.typeMap[newType.name]
            if (newType === existingType) {
                // Exactly the same.  Skip it.
                continue
            }
            // if existing type is undefined, then use the
            // code below to possibly load its recrusive types,
            // and to load it and check it.

            // Native type
            if (isVmNativeType(newType)) {
                if (existingType === undefined) {
                    // Not a recursive type
                    continue
                }
                // Check if they are the same.
                if (!isVmNativeType(existingType)) {
                    return createTypeMismatchError(addedType.source, existingType, newType)
                }
                if (newType.internalType !== existingType.internalType) {
                    return createTypeMismatchError(addedType.source, existingType, newType)
                }
                // They are the same.
                continue
            }

            // KeyOf type.
            //   This doesn't make sense to have if the underlying structure doesn't exist,
            //   but still check it anyway.
            if (isVmKeyOfType(newType)) {
                if (existingType !== undefined) {
                    // Need to perform identity check.
                    if (!isVmKeyOfType(existingType)) {
                        return createTypeMismatchError(addedType.source, existingType, newType)
                    }
                    // This overlaps with iterable type checking...
                    const existingSub = existingType.structureSource
                    const newSub = newType.structureSource
                    if (isVmGenericRef(existingSub) || isVmGenericRef(newSub)) {
                        // Not a recursive call, so don't save off the results.
                        const ret = matchGenericRef(addedType.source, existingSub, newSub)
                        if (ret !== true) {
                            return ret
                        }
                        // The types match up.
                        continue
                    }
                    // Real structures.
                    // Perform a light name check to see if a deep check needs to happen.
                    //   If they don't even have the same name, then don't go deeper, because the
                    //   deep type check might be a false positive.
                    if (existingSub.name !== newSub.name) {
                        return createTypeMismatchError(addedType.source, existingSub, newSub)
                    }
                    // The sub can be checked now deeply.
                    stack.push(newSub)
                    continue
                }
                // Add the type as discovered, and check the sub type.
                discovered.push(newType)
                discoveredNames[newType.name] = true
                if (!isVmGenericRef(newType.structureSource)) {
                    stack.push(newType.structureSource)
                }
                continue
            }
            if (isVmIterableType(newType)) {
                if (existingType !== undefined) {
                    // Need to perform identity check.
                    if (!isVmIterableType(existingType)) {
                        return createTypeMismatchError(addedType.source, existingType, newType)
                    }
                    const existingSub = existingType.valueType
                    const newSub = newType.valueType
                    if (isVmGenericRef(existingSub) || isVmGenericRef(newSub)) {
                        // Not a recursive call, so don't save off the results.
                        const ret = matchGenericRef(addedType.source, existingSub, newSub)
                        if (ret !== true) {
                            return ret
                        }
                        // The types match up.
                        continue
                    }
                    // Real structures.
                    // Perform a light name check to see if a deep check needs to happen.
                    //   If they don't even have the same name, then don't go deeper, because the
                    //   deep type check might be a false positive.
                    if (existingSub.name !== newSub.name) {
                        return createTypeMismatchError(addedType.source, existingSub, newSub)
                    }
                    // The sub can be checked now deeply.
                    stack.push(newSub)
                    continue
                }
                // Add the type as discovered, and check the sub type.
                discovered.push(newType)
                discoveredNames[newType.name] = true
                if (!isVmGenericRef(newType.valueType)) {
                    stack.push(newType.valueType)
                }
                continue
            }
            if (isVmStructuredType(newType)) {
                if (existingType !== undefined) {
                    // Need to perform identity check.
                    if (!isVmStructuredType(existingType)) {
                        return createTypeMismatchError(addedType.source, existingType, newType)
                    }
                    // Types must be identical, unlike normal "applicable for" checking.
                    const newKeys = Object.keys(newType.stores)
                    if (!areKeySetsEqual(newKeys, Object.keys(existingType.stores))) {
                        return createTypeMismatchError(addedType.source, existingType, newType)
                    }
                    for (let idx = 0; idx < newKeys.length; idx++) {
                        const existingSub = existingType.stores[newKeys[idx]].valueType
                        const newSub = newType.stores[newKeys[idx]].valueType
                        // Keyed types can't be generic.
                        // Perform a light name check to see if a deep check needs to happen.
                        //   If they don't even have the same name, then don't go deeper, because the
                        //   deep type check might be a false positive.
                        if (existingSub.name !== newSub.name) {
                            return createTypeMismatchError(addedType.source, existingSub, newSub)
                        }
                        // The sub can be checked now deeply.
                        stack.push(newSub)
                    }
                    continue
                }
                // Add the type as discovered, and check the sub type.
                discovered.push(newType)
                discoveredNames[newType.name] = true
                Object.keys(newType.stores).forEach((key) => {
                    stack.push(newType.stores[key].valueType)
                })
                continue
            }
            if (isVmCallableType(newType)) {
                if (existingType !== undefined) {
                    // Need to perform identity check.
                    if (!isVmCallableType(existingType)) {
                        return createTypeMismatchError(addedType.source, existingType, newType)
                    }
                    const existingRet = existingType.returnType
                    const newRet = newType.returnType
                    if (isVmGenericRef(existingRet) || isVmGenericRef(newRet)) {
                        // Not a recursive call, so don't save off the results.
                        const ret = matchGenericRef(addedType.source, existingRet, newRet)
                        if (ret !== true) {
                            return ret
                        }
                        // The types match up.
                        // Fall through.
                    } else {
                        // Real structures.
                        // Perform a light name check to see if a deep check needs to happen.
                        //   If they don't even have the same name, then don't go deeper, because the
                        //   deep type check might be a false positive.
                        if (existingRet.name !== newRet.name) {
                            return createTypeMismatchError(addedType.source, existingRet, newRet)
                        }
                        // The ret can be checked now deeply.
                        stack.push(newRet)
                        // Fall through.
                    }

                    const existingArg = existingType.argumentType
                    const newArg = newType.argumentType
                    if (isVmGenericRef(existingArg) || isVmGenericRef(newArg)) {
                        // Not a recursive call, so don't save off the results.
                        const ret = matchGenericRef(addedType.source, existingArg, newArg)
                        if (ret !== true) {
                            return ret
                        }
                        // The types match up.
                        continue
                    }
                    // Perform a light name check to see if a deep check needs to happen.
                    //   If they don't even have the same name, then don't go deeper, because the
                    //   deep type check might be a false positive.
                    if (existingArg.name !== newArg.name) {
                        return createTypeMismatchError(addedType.source, existingArg, newArg)
                    }
                    // The sub can be checked now deeply.
                    stack.push(newArg)
                    continue
                }
                discovered.push(newType)
                discoveredNames[newType.name] = true
                if (!isVmGenericRef(newType.returnType)) {
                    stack.push(newType.returnType)
                }
                if (!isVmGenericRef(newType.argumentType)) {
                    stack.push(newType.argumentType)
                }
                continue
            }
            // Not a valid VmType.
            return {
                source: addedType.source,
                errorId: ERROR__USER__UNKOWN_TYPE,
                parameters: {
                    type: newType.name,
                }
            } as RuntimeError
        }
        return discovered
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
        requestor: RuntimeSourcePosition, actual: VmType, expected?: VmType,
    ): RuntimeError | null {
        if (expected === undefined) {
            expected = this.getTypeByName(actual.name)
            if (expected === undefined) {
                return {
                    source: requestor,
                    errorId: ERROR__IMPL_UNKNOWN_TYPE,
                    parameters: {
                        type: actual.name,
                    }
                } as RuntimeError
            }
        }
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
        return matchMaybeGenericTypes(source, expected.argumentType, actual.argumentType, key, alreadyChecked)
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
): RuntimeError | true {
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

function areKeySetsEqual(first: string[], second: string[]): boolean {
    if (first.length !== second.length) {
        return false
    }
    const firstKeys: {[name: string]: boolean} = {}
    for (let idx = 0; idx < first.length; idx++) {
        firstKeys[first[idx]] = true
    }
    for (let idx = 0; idx < second.length; idx++) {
        if (firstKeys[second[idx]] === true) {
            firstKeys[second[idx]] = false
        } else {
            return false
        }
    }
    return true
}
