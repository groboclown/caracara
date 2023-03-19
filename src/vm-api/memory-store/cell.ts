// A single memory indexed entity.

import { RuntimeSourcePosition } from '../../source'
import { VmGenericId, VmStructuredType, VmType } from '../type-system'
import { StructuredKeyType, VmIterableType } from '../type-system/categories'

// VmOpCode A mneumonic for the VM operation to run.
export type VmOpCode = string

// VmMemoryIndex A reference to a specific memory cell.
export type VmMemoryIndex = number

// MemoryCellHeader Common values to all memory cells.
//   Memory cells cannot store generic types, as those are intrinsic in the
//   function and opcode declaration; they must be type bound to be used.
interface MemoryCellHeader<T extends VmType> {
    // source The original script source position defining this cell
    readonly source: RuntimeSourcePosition

    // type The explicit type value of the memory cell
    readonly type: T

    readonly kind: "external" | "constant" | "opcode" | "calling" | "structured" | "iterable"
}

// ExternalMemoryCell A value that came from an external location.
//   Arguments passed from the invoking system will use this as the cell type.
export interface ExternalMemoryCell extends MemoryCellHeader<VmType> {
    readonly kind: "external"

    // name An externally defined name.
    readonly name: string
}

// isExternalMemoryCell Type checker.
export function isExternalMemoryCell(value: MemoryCell): value is ExternalMemoryCell {
    return value.kind === "external"
}

// ConstantRefMemoryCell A single memory cell whose value comes from a constant value.
export interface ConstantRefMemoryCell extends MemoryCellHeader<VmType> {
    readonly kind: "constant"

    // module The module that stores the constant value
    readonly module: string

    // constant The name of the constant value that this memory cell references.
    readonly constant: string
}

// isConstantRefMemoryCell Type checker
export function isConstantRefMemoryCell(value: MemoryCell): value is ConstantRefMemoryCell {
    return value.kind === "constant"
}

// OpCodeBoundTypes The binding of the opcode's generic ID to the bound type.
export interface OpCodeBoundTypes {
    [id: VmGenericId]: VmType
}

// OpCodeMemoryCellType A single memory cell whose value is evaluated from an opcode.
export interface OpCodeMemoryCell extends MemoryCellHeader<VmType> {
    readonly kind: "opcode"

    // opcode The OpCode used to evaluate the memory cell value.
    readonly opcode: VmOpCode

    // arguments The memory cell indicies for each argument for the opcode.
    readonly arguments: VmMemoryIndex[]

    // boundTypes The opcode's generics bound types.
    readonly boundTypes: OpCodeBoundTypes
}

// isOpCodeMemoryCell Type checker.
export function isOpCodeMemoryCell(value: MemoryCell): value is OpCodeMemoryCell {
    return value.kind === "opcode"
}

// CallingMemoryCell A single memory cell whose value is evaluated by a call to a callable.
//   Indicies must line up with the referenced CallableValue.
export interface CallingMemoryCell extends MemoryCellHeader<VmType> {
    // The "type" must match the return type of the callable function
    //   (memory cell with index CALLABLE_RETURN_MEMORY_INDEX).

    readonly kind: "calling"

    // callable The callable function to invoke.
    //    It must reference a VmCallableType cell.
    readonly callable: VmMemoryIndex

    // argument The argument to pass
    readonly argument: VmMemoryIndex

    // Under consideration: the callable may be generic, and thus require
    //   bound types.  That may be something that's done in the script language itself,
    //   and the construction of the cell implicitly binds it, much like how C++ templates
    //   create code copies for each templated instance.
}

// isCallingMemoryCell Type checker.
export function isCallingMemoryCell(value: MemoryCell): value is CallingMemoryCell {
    return value.kind === "calling"
}

// StructureReferenceMemoryCell An assembled structure through references to other memory indicies.
export interface StructureReferenceMemoryCell extends MemoryCellHeader<VmStructuredType> {
    readonly kind: "structured"

    // values The memory index for each structured key.
    //   The cell MUST contain every key in the type structure (and only those keys), and
    //   the memory index type MUST be type compatible with the key's type.
    readonly values: {[key: StructuredKeyType]: VmMemoryIndex}
}

// isStructureReferenceMemoryCell Type checker.
export function isStructureReferenceMemoryCell(value: MemoryCell): value is StructureReferenceMemoryCell {
    return value.kind === "structured"
}

// IterableReferenceMemoryCell A static length list of memory indicies to include in a new iterable.
export interface IterableReferenceMemoryCell extends MemoryCellHeader<VmIterableType> {
    readonly kind: "iterable"

    // values The memory index for each structured key.
    //   The cell MUST contain every key in the type structure (and only those keys), and
    //   the memory index type MUST be type compatible with the key's type.
    readonly values: VmMemoryIndex[]
}

// isIterableReferenceMemoryCell Type checker.
export function isIterableReferenceMemoryCell(value: MemoryCell): value is IterableReferenceMemoryCell {
    return value.kind === "iterable"
}

// MemoryCellType A single memory cell as defined by the function layout.
export type MemoryCell = (
    | ExternalMemoryCell
    | ConstantRefMemoryCell
    | OpCodeMemoryCell
    | CallingMemoryCell
    | StructureReferenceMemoryCell
    | IterableReferenceMemoryCell
)
