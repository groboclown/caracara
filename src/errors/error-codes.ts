// Error IDs
// Used for localization.

const VM_ERROR                              = 0x100000

const ERROR__VM_MEMORY_CATEGORY             = 0x10000 | VM_ERROR
export const VM_MEMORY_STRUCTURE_CORRUPT    = 1 | ERROR__VM_MEMORY_CATEGORY
export const VM_MEMORY_TYPE_CONFUSION       = 2 | ERROR__VM_MEMORY_CATEGORY

const ERROR__VM_EXECUTION                   = 0x20000 | VM_ERROR
export const VM_INSTRUCTION_ORDER_VIOLATION = 1 | ERROR__VM_EXECUTION

const ERROR__VM_BUG                         = 0xf0000 | VM_ERROR
export const VM_BUG_UNKNOWN_PRIMARY_TYPE    = 1 | ERROR__VM_BUG
export const VM_BUG_NON_EVALUATED_VALUE     = 2 | ERROR__VM_BUG


const USER_ERROR                            = 0x200000

const ERROR__USER_RUNTIME                   = 0x10000 | USER_ERROR
export const ERROR__USER__MODULE_NOT_FOUND  = 1 | ERROR__USER_RUNTIME
export const ERROR__USER__CONST_NOT_FOUND   = 2 | ERROR__USER_RUNTIME
export const ERROR__USER__TYPE_MISMATCH     = 3 | ERROR__USER_RUNTIME
