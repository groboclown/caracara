// Explicit types required to be included in the type store.

import { createCoreSource } from '../../source'
import { createInternalSource } from '../../source/internal'
import { VmNativeType } from './categories'

// META_TYPE a typed value that stores a reference to a type.
export const META_TYPE: VmNativeType = {
    source: createCoreSource('required.type'),
    name: 'meta-type',
    internalType: 'meta-type',
}

// RUNTIME_TYPE an internal-only type for opcode return values that return runtime determined types
export const RUNTIME_TYPE: VmNativeType = {
    source: createInternalSource('required.runtime-determined'),
    name: 'runtime-determined',
    internalType: 'runtime-determined',
}
