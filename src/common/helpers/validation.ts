// Validation helpers

import { RuntimeError, ValidationProblem } from '../../errors'
import { isRuntimeError } from '../../errors/struct'
import { GeneratedError, GeneratedValue } from '../../vm-api/interpreter'

type Issue = null | undefined | ValidationProblem | GeneratedError | RuntimeError

// ValidationCollector Collects validation with all kinds of type conversions.
export class ValidationCollector {
    validations: ValidationProblem[] = []

    isErr(): boolean {
        return this.validations.length > 0
    }

    // asRuntimeError Convert this collection of issues to a RuntimeError
    //   It must have at least 1 error.
    asRuntimeError(): RuntimeError {
        if (!this.isErr()) {
            throw new Error('Must have at least 1 error.')
        }
        // For now, return the first error.  Should be enhanced?
        return {
            source: this.validations[0].source,
            errorId: this.validations[0].problemId,
            parameters: this.validations[0].parameters,
        } as RuntimeError
    }

    // asGenerated Create either an error or value, depending on this collector problem state.
    asGenerated(value: any): GeneratedError | GeneratedValue {
        if (this.isErr()) {
            return {
                error: this.asRuntimeError()
            } as GeneratedError
        }
        return { value } as GeneratedValue
    }

    addCollector(col: ValidationCollector): ValidationCollector {
        const self = this
        col.validations.forEach((val) => { self.validations.push(val) })
        return self
    }

    add(value: Issue | Issue[]): ValidationCollector {
        const self = this
        if (value === null || value === undefined) {
            return self
        }
        if (Array.isArray(value)) {
            value.forEach((val) => {
                self.add(val)
            })
        } else if (isRuntimeError(value)) {
            self.addRuntimeError(value)
        } else if (typeof value === 'object' && (<GeneratedError>value).error !== undefined) {
            self.addRuntimeError((<GeneratedError>value).error)
        } else {
            self.validations.push(<ValidationProblem>value)
        }
        return self
    }

    private addRuntimeError(error: RuntimeError): void {
        this.validations.push({
            source: error.source,
            problemId: error.errorId,
            parameters: error.parameters || {},
        })
    }
}
