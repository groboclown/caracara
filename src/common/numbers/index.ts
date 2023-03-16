// Integer and Floating Point Number Support

export {
    OPCODE__ADD_NUMBERS,
    OpCodeAddNumbers,
    OPCODE__ADD_INTEGERS,
    OpCodeAddIntegers,
} from './opcode-add'
export {
    NUMBER_TYPE,
    isMemoryCellNumber,
    isMemoryValueNumber,
    isEvaluatedNumber,
    validateMemoryValueNumber,
    memoryValueAsNumber,
    INTEGER_TYPE,
    isEvaluatedInteger,
    isMemoryCellInteger,
    isMemoryValueInteger,
    validateMemoryValueInteger,
    memoryValueAsInteger,
} from './type-number'
