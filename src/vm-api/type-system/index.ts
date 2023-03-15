// The interpreter's typing system.

export type {
    VmType,
    VmNativeType,
    VmIterableType,
    VmStructuredType,
    VmKeyOfType,
    VmCallableType,
    VmGenericId,
    VmGenericRef,
} from './categories'
export {
    VmGenericBindHint,
    isVmNativeType,
    isVmIterableType,
    isVmStructuredType,
    isVmKeyOfType,
    isVmCallableType,
    isVmGenericRef,
} from './categories'
export type {
    TypeStore,
    TypeStoreManager,
} from './type-store'
export {
    META_TYPE,
    RUNTIME_TYPE,
} from './required'
