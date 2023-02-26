// Internal source providers

import { SourcePosition } from './position'

export function createInternalSource(name: string): SourcePosition {
    return {
        moduleName: `$.internal.${name}`,
        line: 0,
        column: 0,
    } as SourcePosition
}
