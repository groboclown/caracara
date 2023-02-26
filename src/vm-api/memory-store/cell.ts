// A single memory indexed entity.

import { RuntimeSourcePosition } from '../../source'
import { VmType } from '../type-system'

// VmOpCode A mneumonic for the VM operation to run.
export type VmOpCode = string

// VmMemoryIndex A reference to a specific memory cell.
export type VmMemoryIndex = number

// MemoryCellType A single memory cell whose value comes from a constant value.
export interface ConstantRefMemoryCell {
    // source The original script source position defining this cell
    readonly source: RuntimeSourcePosition

    // type The explicit type value of the memory cell
    readonly type: VmType

    // module The module that stores the constant value
    readonly module: string

    // constant The name of the constant value that this memory cell references.
    readonly constant: string
}

// OpCodeMemoryCellType A single memory cell whose value is evaluated from an opcode.
export interface OpCodeMemoryCell {
    // source The original script source position defining this cell
    readonly source: RuntimeSourcePosition

    // type The explicit type value of the memory cell
    readonly type: VmType

    // opcode The OpCode used to evaluate the memory cell value.
    readonly opcode: VmOpCode

    // arguments The memory cell indicies for each argument for the opcode.
    readonly arguments: VmMemoryIndex[]
}

// MemoryCellType A single memory cell as defined by the function layout.
export type MemoryCell = ConstantRefMemoryCell | OpCodeMemoryCell
