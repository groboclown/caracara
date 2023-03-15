// Common generic types.

import { createCoreSource } from '../../source'
import { VmGenericRef, VmKeyOfType, VmGenericBindHint } from '../../vm-api/type-system'

// GENERIC_T_TYPE The standard "T" for any type.
export const GENERIC_T_TYPE = {
    genericId: "T",
    bindHint: VmGenericBindHint.any,
} as VmGenericRef

// GENERIC_R_TYPE The standard "R" for any return type.
export const GENERIC_R_TYPE = {
    genericId: "R",
    bindHint: VmGenericBindHint.any,
} as VmGenericRef

// GENERIC_S_TYPE The standard "S" for structured types.
export const GENERIC_S_TYPE = {
    genericId: "S",
    bindHint: VmGenericBindHint.structure,
} as VmGenericRef

// GENERIC_K_TYPE The standard "K" for structured types keys.
export const GENERIC_K_TYPE = {
    genericId: "K",
    bindHint: VmGenericBindHint.keyof,
} as VmGenericRef

// BOUND_KEYOF_TYPE A key argument bound to the "S" type on the context.
export const BOUND_KEYOF_S_TYPE = {
    source: createCoreSource('types.generic-struct'),
    structureSource: GENERIC_S_TYPE,
} as VmKeyOfType
