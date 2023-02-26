// Internal source providers

import { SourcePosition } from './position'

export function createCoreSource(name: string): SourcePosition {
    return {
        moduleName: `$.core.${name}`,
        line: 0,
        column: 0,
    } as SourcePosition
}
