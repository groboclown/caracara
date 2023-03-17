// A single memory indexed entity.

import { RuntimeSourcePosition } from '../../source'
import { VmGenericId, VmType } from '../type-system'

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

// OpCodeBoundTypes The binding of the opcode's generic ID to the bound type.
export interface OpCodeBoundTypes {
    [id: VmGenericId]: VmType
}

// OpCodeMemoryCellType A single memory cell whose value is evaluated from an opcode.
export interface OpCodeMemoryCell {
    // source The original script source position defining this cell
    readonly source: RuntimeSourcePosition

    // type The explicit type value of the memory cell
    //   Memory cells cannot store generic types, as those are intrinsic in the
    //   function and opcode declaration; they must be type bound to be used.
    readonly type: VmType

    // opcode The OpCode used to evaluate the memory cell value.
    readonly opcode: VmOpCode

    // arguments The memory cell indicies for each argument for the opcode.
    readonly arguments: VmMemoryIndex[]

    // boundTypes The opcode's generics bound types.
    readonly boundTypes: OpCodeBoundTypes
}

// FunctionMemoryCell A single memory cell whose value is evaluated by a call to a callable.
export interface FunctionMemoryCell {
    // source The original script source position defining this cell
    readonly source: RuntimeSourcePosition

    // type The explicit type value of the memory cell
    //   This must match the return type of the callable function.
    readonly type: VmType

    // callable The callable function to invoke.
    readonly callable: VmMemoryIndex

    // argument The argument to pass
    readonly argument: VmMemoryIndex

    // Under consideration: the callable may be generic, and thus require
    //   bound types.  That may be something that's done in the script language itself,
    //   and the construction of the cell implicitly binds it, much like how C++ templates
    //   create code copies for each templated instance.
}

// MemoryCellType A single memory cell as defined by the function layout.
export type MemoryCell = ConstantRefMemoryCell | OpCodeMemoryCell | FunctionMemoryCell
