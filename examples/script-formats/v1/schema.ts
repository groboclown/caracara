// The JSON schema

import Ajv, { JTDSchemaType } from 'ajv/dist/jtd'
import { VALIDATION_USER_SCRIPT_BAD_STRUCTURE } from '../../../src/errors'
import { ValidationProblem, ValidationResult } from '../../../src/errors/struct'
import { RuntimeSourcePosition } from '../../../src/source'
import { Module } from '../../../src/vm-api/interpreter'
import { ScriptContents } from '../contents'

interface V1DataStruct {
    modules: V1ModuleMap
    global_types: V1TypeMap
}

interface V1ModuleMap {
    [name: string]: V1Module
}

interface V1Module {
    // types Module local types.
    types: V1TypeMap
}

interface V1TypeMap {
    [name: string]: V1Type
}

interface V1Type {

}

const V1TYPEMAP_SCHEMA = {
    type: "object",
    patternProperties: {
        '[a-zA-Z][a-zA-Z0-9_]*': {
            type: "object",
            properties: {},
        } as JTDSchemaType<V1Type>,
    },
} as JTDSchemaType<V1TypeMap>

const V1_SCHEMA: JTDSchemaType<V1DataStruct> = {
    properties: {
        modules: {
            type: "object",
            patternProperties: {
                '[a-zA-Z][a-zA-Z0-9_]*': {
                    type: "object",
                    properties: {
                        types: V1TYPEMAP_SCHEMA,
                    }
                } as JTDSchemaType<V1Module>
            },
        } as JTDSchemaType<V1ModuleMap>,
        global_types: V1TYPEMAP_SCHEMA,
    },
    optionalProperties: {},
}


export function parseV1(parent: RuntimeSourcePosition, raw: string): ValidationResult<ScriptContents> {
    const parser = new Ajv().compileParser(V1_SCHEMA)
    const data = parser(raw)
    if (data === undefined) {
        return {
            result: undefined,
            problems: [
                {
                    source: parent,
                    problemId: VALIDATION_USER_SCRIPT_BAD_STRUCTURE,
                    parameters: {
                        message: parser.message,
                        position: parser.position,
                    },
                } as ValidationProblem
            ],
        } as ValidationResult<ScriptContents>
    }
    // else data is a V1DataStruct.
    throw new Error("Not implemented")
}
