import {
  CompilerOptions,
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
  createCompilerHost,
  createProgram,
  flattenDiagnosticMessageText,
  getPreEmitDiagnostics,
} from 'typescript'

import { default as transform } from '.'

const TS_CONFIG: CompilerOptions = {
  experimentalDecorators: true,
  module: ModuleKind.CommonJS,
  moduleResolution: ModuleResolutionKind.NodeJs,
  noEmitOnError: false,
  noUnusedLocals: true,
  noUnusedParameters: true,
  stripInternal: true,
  target: ScriptTarget.ES2015,
}

export default function compile(
  testName: string,
  input: string[],
  assetsMatch: string,
  targetPath?: string
): boolean {
  const options: CompilerOptions = {
    ...TS_CONFIG,
    outDir: `dist/test/${testName}`,
  }
  const compilerHost = createCompilerHost(options)
  const program = createProgram(input, options, compilerHost)

  const emitResult = program.emit(undefined, undefined, undefined, undefined, {
    before: [transform({ assetsMatch, targetPath })],
  })

  const allDiagnostics = getPreEmitDiagnostics(program).concat(
    emitResult.diagnostics
  )

  let success = true
  allDiagnostics.forEach(diagnostic => {
    const { line, character } = diagnostic.file
      ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!)
      : { line: 0, character: 0 }
    const message = flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    const fileName = diagnostic.file ? diagnostic.file.fileName : '(unknown)'
    success = false
    console.log(`${fileName} (${line + 1},${character + 1}): ${message}`)
  })

  return success
}