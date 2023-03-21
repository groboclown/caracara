// Defines the per-fuction memory index layout.

export type {
    GeneratedError,
    GeneratedValue,
    LazyValue,
    OpCodeReducerValue,
    FunctionReducerValue,
    ReducerValue,
    OpCodeResult,
} from './returns'
export {
    isGeneratedError,
} from './returns'
export type {
    VmMemoryIndex,
    VmOpCode,
    ConstantRefMemoryCell,
    OpCodeBoundTypes,
    OpCodeMemoryCell,
    MemoryCell,
} from './cell'
export type {
    NativeValue,
    IterableValue,
    StructuredValue,
    CallableValue,
    KeyOfValue,
    EvaluatedValue,
    MemoryValue,
} from './value'
export type {
    MemoryFactory,
    StructuredFactory,
    IterableFactory,
    CallFactory,
} from './factory'
