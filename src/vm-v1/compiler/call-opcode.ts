// Compile a constant result.

import { ValidationResult } from "../../errors/struct"
import { OpCodeMemoryCell } from "../../vm-api/memory-store/cell"
import { CompiledCall } from "./defs"
import { CallConstruction } from "./internal"

// createConstantCall Create a call that returns a constant value.
export function createOpCodeCall(_cc: CallConstruction<OpCodeMemoryCell>): ValidationResult<CompiledCall> {
    // FIXME
    throw new Error("not implemented yet")
}
