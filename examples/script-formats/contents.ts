// The contents that a script file must include.

import { Module } from "../../src/vm-api/interpreter";
import { VmType } from "../../src/vm-api/type-system";

// ScriptContents Contents of a script, that a parser returns.
export interface ScriptContents {
    // modules All the modules in the script.
    modules: Module[]

    // types All the types declared in the script and its modules.
    //   The invoking program will need to augment this with its own types, including
    //   required native types that the script cannot define.
    types: VmType[]
}
