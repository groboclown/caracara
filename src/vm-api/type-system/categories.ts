// Typing declarations for input into the interpreter.

import { RuntimeSourcePosition } from '../../source'


// VmType Top order of the strict typing system.
export interface VmType {
    // source Debug source of the type.  May be null if debugging is not enabled.
    readonly source: RuntimeSourcePosition

    // name The VmType name.
    //   The name must be unique within the runtime.
    readonly name: string
}

// VmTypedNative References a built-in types.
//   Because native types are owned by the implementing system,
//   they must support an explicit value-is-a check.
interface VmTypedNative {
    // internalType Underlying unique name for this native type.
    //   Type aliasing can cause the name to be something else, but
    //   the internal types must be equal to refer to the same native type.
    readonly internalType: string

    // isType Is the evaluated native value this kind of native?
    //   Note that, due to ordering, this doesn't reference NativeValue,
    //   but the type of the argument here must align with the NativeValue.
    isType(value: object | number | string | boolean): boolean
}

// VmNativeType A VM simple type.
export type VmNativeType = VmTypedNative & VmType

// isVmNativeType Type checker
export function isVmNativeType(val: VmType): val is VmNativeType {
    return (<VmNativeType>val).internalType !== undefined
}

// VmGenericId The identifier for the opcode's generic type.
//   An opcode with a generic type has the corresponding type included in the
//   definition of the specific opcode.  A generic ID only has meaning
//   within the context of an opcode or function.
export type VmGenericId = string

// VmGenericBindHint Hints at the kind of reference that the type is allowed to be bound to.
export enum VmGenericBindHint {
    structure,
    iterable,
    nonterminating_iterable,
    keyof,
    any,
}

// VmGenericRef A replacement value for a type bound by an outer context.
//   Note that a generic reference is not itself a type.
export interface VmGenericRef {
    // genericId The name of the generic defined by the outer context.
    //   It will be bound by the static context usage.
    readonly genericId: VmGenericId
    readonly bindHint: VmGenericBindHint
}

// isVmGenericRef Type checker
export function isVmGenericRef(val: VmType | VmGenericRef): val is VmGenericRef {
    return (<VmGenericRef>val).genericId !== undefined
}

// StructuredKeyType A structured type's key type.
export type StructuredKeyType = string

// TypeKey A named key in a structured type.
//    Note: not a type by itself.
interface TypeKey {
    readonly key: StructuredKeyType
    readonly valueType: VmType
}

// VmTypedStructured A type that stores keyed values.
//   The structured type cannot have generic key values.
interface VmTypedStructure {
    readonly stores: { [key: string]: TypeKey }
}

// VmStructuredType The VM explicit structured type
export type VmStructuredType = VmTypedStructure & VmType

// isVmStructuredType Type checker
export function isVmStructuredType(val: VmType): val is VmStructuredType {
    return (<VmStructuredType>val).stores !== undefined
}

// VmTypedIterable an interable (non-indexable) value store.
//   May have generic value types.  All iterables are guaranteed to terminate.
interface VmTypedIterable {
    // valueType The type of each element in the iterable.
    readonly valueType: VmType | VmGenericRef
}

// VmIterableType a VM collection of fixed length items
//   May have generic value types.
export type VmIterableType = VmTypedIterable & VmType

// isVmIterableType type checker
export function isVmIterableType(val: VmType): val is VmIterableType {
    return (<VmIterableType>val).valueType !== undefined
}

// VmTypedCallable call signature for a function
interface VmTypedCallable {
    // argumentTypes The arguments passed to the callable.  All arguments to a user
    //   function are passed as key-value pairs.
    readonly argumentTypes: VmStructuredType | VmGenericRef

    // returnType The value returned by the function.
    readonly returnType: VmType | VmGenericRef
}

// VmCallableType A value that can be invoked.
export type VmCallableType = VmTypedCallable & VmType

// isVmCallableType Type checker
export function isVmCallableType(val: VmType): val is VmCallableType {
    return (<VmCallableType>val).argumentTypes !== undefined
}

// VmTypedKeyOf The name of a key in a structured type.
interface VmTypedKeyOf {
    // structuredType The related structured type that this value must be a key of.
    readonly structureSource: VmStructuredType | VmGenericRef
}

// VmKeyOfType One of the keys in a structured type.
export type VmKeyOfType = VmTypedKeyOf & VmType

// isVmKeyOfType Type checker
export function isVmKeyOfType(val: VmType): val is VmKeyOfType {
    return (<VmKeyOfType>val).structureSource !== undefined
}
