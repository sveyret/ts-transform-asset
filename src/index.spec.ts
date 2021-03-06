/* eslint-disable prefer-arrow-callback */
import { expect } from 'chai'
import Compiler, { CompilationResult } from 'ts-transform-test-compiler'

import transformer from '.'

describe('ts-transform-asset', function () {
  this.slow(2000)
  this.timeout(10000)

  const testCases: {
    [name: string]: {
      rootDir?: string
      template?: string
      result: {
        fullImport: string
        defaultImport: string
        moduleImport: string | undefined
        defaultExport: string
        namedExport: string
      }
    }
  } = {
    root: {
      template: '[name].[ext]',
      result: {
        fullImport: 'image.png',
        defaultImport: 'image.svg',
        moduleImport: 'picture.svg',
        defaultExport: 'image.svg',
        namedExport: 'image.svg',
      },
    },
    path: {
      template: 'assets/[name].[ext]',
      result: {
        fullImport: 'assets/image.png',
        defaultImport: 'assets/image.svg',
        moduleImport: 'assets/picture.svg',
        defaultExport: 'assets/image.svg',
        namedExport: 'assets/image.svg',
      },
    },
    default: {
      rootDir: '__test__',
      result: {
        fullImport: '[hash].png',
        defaultImport: 'b05767c238cb9f989cf3cd8180594878.svg',
        moduleImport: 'bee0f4fbbfd53e62289432b4a070cd03.svg',
        defaultExport: 'b05767c238cb9f989cf3cd8180594878.svg',
        namedExport: 'b05767c238cb9f989cf3cd8180594878.svg',
      },
    },
    format: {
      rootDir: '__test__',
      template: '[path][folder]_[hash]-[contenthash].[ext]',
      result: {
        fullImport: 'sub/folder/folder_[hash]-[contenthash].png',
        defaultImport: '_b05767c238cb9f989cf3cd8180594878-b05767c238cb9f989cf3cd8180594878.svg',
        moduleImport:
          'node_modules/dummy/dummy_bee0f4fbbfd53e62289432b4a070cd03-bee0f4fbbfd53e62289432b4a070cd03.svg',
        defaultExport: '_b05767c238cb9f989cf3cd8180594878-b05767c238cb9f989cf3cd8180594878.svg',
        namedExport: '_b05767c238cb9f989cf3cd8180594878-b05767c238cb9f989cf3cd8180594878.svg',
      },
    },
    formatNoRoot: {
      template: '[path][folder]_[hash]-[contenthash].[ext]',
      result: {
        fullImport: '__test__/sub/folder/folder_[hash]-[contenthash].png',
        defaultImport:
          '__test__/__test___b05767c238cb9f989cf3cd8180594878-b05767c238cb9f989cf3cd8180594878.svg',
        moduleImport: undefined,
        defaultExport:
          '__test__/__test___b05767c238cb9f989cf3cd8180594878-b05767c238cb9f989cf3cd8180594878.svg',
        namedExport:
          '__test__/__test___b05767c238cb9f989cf3cd8180594878-b05767c238cb9f989cf3cd8180594878.svg',
      },
    },
  }
  const compiler = new Compiler(transformer, 'dist/__test__')

  describe('Configuration problems', function () {
    const badConfigurationCases: {
      [name: string]: { config: any; message: RegExp }
    } = {
      'bad configuration type': { config: true, message: /configuration must be an object/ },
      'missing assetsMatch': { config: {}, message: /missing “assetsMatch” entry/ },
      'bad assetsMatch type': { config: { assetsMatch: true }, message: /“assetsMatch” must be a string/ },
      'bad targetName type': {
        config: { assetsMatch: 'string', targetName: {} },
        message: /“targetName” must be a string/,
      },
    }
    Object.entries(badConfigurationCases).forEach(([name, { config, message }]) => {
      it(`should throw an error if ${name}`, function () {
        expect(() => compiler.setRootDir('__test__').compile('config', config)).to.throw(message)
      })
    })
  })

  Object.entries(testCases).forEach(([name, testCase]) => {
    describe(`Compile with ${testCase.template || 'default'} template${
      testCase.rootDir ? ` in ${testCase.rootDir}` : ''
    }`, function () {
      let result: CompilationResult
      before(`Compile files to ${name}`, function () {
        result = compiler
          .setRootDir(testCase.rootDir)
          .setSourceFiles(testCase.rootDir ? '/' : '__test__/')
          .compile(name, { assetsMatch: '\\.(png|svg|ogg)$', targetName: testCase.template })
        result.print()
      })

      Array.of('success', 'package/success').forEach(file => {
        describe(`...in file ${file}`, function () {
          it('should find full module import file', function () {
            expect(result.requireContent(file)('fullImport')).to.equal(testCase.result.fullImport)
          })

          it('should find default module import file', function () {
            expect(result.requireContent(file)('defaultImport')).to.equal(testCase.result.defaultImport)
          })

          if (testCase.result.moduleImport) {
            it('should find external module file', function () {
              expect(result.requireContent(file)('moduleImport')).to.equal(testCase.result.moduleImport)
            })
          }

          it('should find default re-exported file', function () {
            expect(result.requireContent(file)('defaultExport')).to.equal(testCase.result.defaultExport)
          })

          it('should find named re-exported file', function () {
            expect(result.requireContent(file)('namedExport')).to.equal(testCase.result.namedExport)
          })
        })
      })

      it('should fail to require bad module', function () {
        expect(() => result.requireContent('failure')).to.throw()
      })
    })
  })
})
