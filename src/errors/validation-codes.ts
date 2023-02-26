// Validation IDs
// Used for localization.

const VM_VALIDATION                           = 0x800000

const VALIDATION__OPCODE                      = 0x10000 | VM_VALIDATION
export const VALIDATION_OPCODE_ARGUMENT_COUNT = 1 | VALIDATION__OPCODE
export const VALIDATION_OPCODE_ARGUMENT_TYPE  = 2 | VALIDATION__OPCODE
export const VALIDATION_OPCODE_ARGUMENT_REF   = 3 | VALIDATION__OPCODE
