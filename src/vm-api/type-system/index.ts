// The interpreter's typing system.

export type {
    VmType,
    VmNativeType,
    VmIterableType,
    VmStructuredType,
    VmCallableType,   
} from './categories'
export {
    isVmNativeType,
    isVmIterableType,
    isVmStructuredType,
    isVmCallableType,
} from './categories'
export type {
    TypeStore,
    TypeStoreManager,
} from './type-store'
export {
    META_TYPE,
    RUNTIME_TYPE,
} from './required'
