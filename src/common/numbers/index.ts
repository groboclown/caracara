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
    createEvaluatedNumber,
    validateMemoryValueNumber,
    memoryValueAsNumber,
    INTEGER_TYPE,
    isEvaluatedInteger,
    isMemoryCellInteger,
    isMemoryValueInteger,
    createEvaluatedInteger,
    validateMemoryValueInteger,
    memoryValueAsInteger,
} from './type-number'
