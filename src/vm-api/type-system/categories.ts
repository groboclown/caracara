// Typing declarations for input into the interpreter.

import { RuntimeSourcePosition } from '../../source'


// VmType top order of the strict typing system.
export interface VmType {
    // source Debug source of the type.  May be null if debugging is not enabled.
    readonly source: RuntimeSourcePosition

    // name The VmType name.
    //   The name must be unique within the runtime.
    readonly name: string
}

// VmTypedNative references a built-in types.
interface VmTypedNative {
    readonly internalType: string
}

// VmNativeType a VM simple type.
export type VmNativeType = VmTypedNative & VmType

// isVmNativeType type checker
export function isVmNativeType(val: VmType): val is VmNativeType {
    return (<VmNativeType>val).internalType !== undefined
}

export type StructuredKeyType = string

// TypeKey a named key in a structured type.
//    Note: not a type by itself.
interface TypeKey {
    readonly key: StructuredKeyType
    readonly valueType: VmType
}

// VmStructured a type that stores keyed values
interface VmTypedStructure {
    readonly stores: { [key: string]: TypeKey }
}

// VmStructuredType the VM explicit structured type
export type VmStructuredType = VmTypedStructure & VmType

// isVmStructuredType type checker
export function isVmStructuredType(val: VmType): val is VmStructuredType {
    return (<VmStructuredType>val).stores !== undefined
}

// VmTypedIterable an interable (non-indexable) value store.
interface VmTypedIterable {
    readonly valueType: VmType
}

// VmIterableType a VM collection of fixed length items
export type VmIterableType = VmTypedIterable & VmType

// isVmIterableType type checker
export function isVmIterableType(val: VmType): val is VmIterableType {
    return (<VmIterableType>val).valueType !== undefined
}

// VmTypedCallable call signature for a function
interface VmTypedCallable {
    // argumentTypes The arguments passed to the callable.  All arguments to a user
    //   function are passed as key-value pairs.
    readonly argumentTypes: VmStructuredType

    // returnType The value returned by the function.
    readonly returnType: VmType
}

// VmCallableType a value that can be invoked.
export type VmCallableType = VmTypedCallable & VmType

// isVmCallableType type checker
export function isVmCallableType(val: VmType): val is VmCallableType {
    return (<VmCallableType>val).argumentTypes !== undefined
}
