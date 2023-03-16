// Common generic types.

import { createCoreSource } from '../../source'
import { VmGenericRef, VmKeyOfType, VmGenericBindHint, VmIterableType } from '../../vm-api/type-system'

// GENERIC_T_TYPE The standard "T" for any type.
export const GENERIC_T_TYPE = {
    genericId: 'T',
    bindHint: VmGenericBindHint.any,
} as VmGenericRef

// GENERIC_R_TYPE The standard "R" for any return type.
export const GENERIC_R_TYPE = {
    genericId: 'R',
    bindHint: VmGenericBindHint.any,
} as VmGenericRef

// GENERIC_S_TYPE The standard "S" for structured types.
export const GENERIC_S_TYPE = {
    genericId: 'S',
    bindHint: VmGenericBindHint.structure,
} as VmGenericRef

// GENERIC_K_TYPE The standard "K" for structured types keys.
export const GENERIC_K_TYPE = {
    genericId: 'K',
    bindHint: VmGenericBindHint.keyof,
} as VmGenericRef

// BOUND_KEYOF_TYPE A key argument bound to the "S" type on the context.
export const BOUND_KEYOF_S_TYPE = {
    source: createCoreSource('types.generic-struct'),
    structureSource: GENERIC_S_TYPE,
} as VmKeyOfType

// GENERIC_ITERABLE_T_TYPE An iterable with items of type GENERIC_T_TYPE; termination is undefined.
export const GENERIC_ITERABLE_T_TYPE = {
    source: createCoreSource('types.generic-iterable'),
    valueType: GENERIC_T_TYPE,
    terminates: undefined,
} as VmIterableType

// GENERIC_TERM_ITERABLE_T_TYPE An iterable with items of type GENERIC_T_TYPE, of finite length.
export const GENERIC_TERM_ITERABLE_T_TYPE = {
    source: createCoreSource('types.generic-iterable'),
    valueType: GENERIC_T_TYPE,
    terminates: true,
} as VmIterableType
