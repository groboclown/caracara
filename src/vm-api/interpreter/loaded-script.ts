// The complete script environment.

import { RuntimeSourcePosition } from '../../source'
import { CallableValue } from '../memory-store'
import { KeyOfValue, NativeValue } from '../memory-store/value'
import { TypeStore, VmType } from '../type-system'
import { StructuredKeyType } from '../type-system/categories'

// StoredConstantValue Simplified version of EvaluatedValue
//   The complex types are in a more native format to enforce all values existing,
//   and to make it possible for implementing systems to create.
export type StoredConstantValue = (
    | NativeValue
    | KeyOfValue
    | CallableValue
    | StoredConstantValue[]
    | {[key: StructuredKeyType]: StoredConstantValue}
)

// ConstantValue A pre-evaluated value defined by the script.
export interface ConstantValue {
    // source The location that the script parser read the value.
    source: RuntimeSourcePosition

    // type The value's type.
    type: VmType

    // value The pre-evaluated value.
    // This must match the value's type.
    value: StoredConstantValue
}

// Module A single script unit
export interface Module {
    // name The fully qualified module name.
    // Must be unique within the script context.
    readonly name: string

    // source The location that the script parser loaded the module.
    readonly source: RuntimeSourcePosition

    // constants All constant values defined by the module.
    // This includes function definitions.
    readonly constants: {[name: string]: ConstantValue}
}

// ScriptContext Structure containing the script values ready for the interpreter to use.
export interface ScriptContext {
    // modules The modules loaded in the script context.
    readonly modules: {[name: string]: Module}

    // types The types declared by the scripts for use.
    readonly types: TypeStore
}
