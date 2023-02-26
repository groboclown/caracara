// Error Structures

import { RuntimeSourcePosition } from '../source'

// ValidationProblem A problem during the validation phase.
export interface ValidationProblem {
    readonly source: RuntimeSourcePosition
    readonly problemId: number

    // parameters can be augmented up the call stack.
    parameters: { [key: string]: string | number }
}

// ValidationResult Validation problems, and possibly an evaluated result.
export interface ValidationResult<T> {
    readonly result: T | undefined
    readonly problems: ValidationProblem[]
}

// RuntimeError an error encountered during runtime.
export interface RuntimeError {
    readonly source: RuntimeSourcePosition
    readonly errorId: number

    // parameters can be augmented up the call stack.
    parameters?: { [key: string]: string | number }
}

// isRuntimeError type checker
export function isRuntimeError(value: any): value is RuntimeError {
    if (typeof value !== 'object') {
        return false
    }
    return (
        typeof (<RuntimeError>value).source === 'object'
        && typeof (<RuntimeError>value).errorId === 'number'
        && (
            (<RuntimeError>value).parameters === undefined
            || typeof (<RuntimeError>value).parameters === 'object'
        )
    )
}
