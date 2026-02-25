import * as repl from 'repl'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

/*
 * Helpers
 */

/*
 * Reload modules clearing caches and requiring them again.
 */
function loadModule(server: repl.REPLServer, path: string | string[]): repl.REPLServer {
  path = typeof path === 'string' ? [path] : path

  path.forEach((path) => {
    const filePath = require.resolve(path)

    delete require.cache[filePath]
    const exports: Record<string, any> = require(path)

    Object.keys(exports).forEach((key: string) => {
      const codeToLoad = exports[key]
      server.context[key] = codeToLoad
    })

    console.log(`Loaded: ${filePath}`)
  })

  return server
}

/*
 * List recursively all TS files in a directory.
 */
function listTsFiles(dirPath: string): string[] {
  let tsFiles: string[] = []

  const files = fs.readdirSync(dirPath)

  files.forEach((file) => {
    const filePath = path.join(dirPath, file)
    const fileStatus = fs.statSync(filePath)

    if (fileStatus.isDirectory() && !file.match(/test/i)) {
      tsFiles = tsFiles.concat(listTsFiles(filePath))
    } else if (file.endsWith('.js') || file.endsWith('.ts')) {
      tsFiles.push(filePath)
    }
  })

  return tsFiles
}

/*
 * Main
 */

// Prepare env
process.env.START_SERVER = 'false'

// Start REPL server
let server = repl.start({
  prompt: '> ',
  useColors: true,
})

console.log('====== TS interactive shell ======')

// Initial load of the source files
const srcDir = path.resolve(__dirname, './src')
loadModule(server, listTsFiles(srcDir))

// Set up file to preserve the REPL history
server.setupHistory('.node_repl_history', (error) => error && console.log(error))

// Start prompting commands
server.displayPrompt()

// Manual reload command
server.defineCommand('reload', {
  help: 'Reload the entire app with the latest code',
  action() {
    server = loadModule(server, listTsFiles(srcDir))
    server.displayPrompt()
  },
})

server.defineCommand('exit', {
  help: 'Reload the entire app with the latest code',
  action() {
    process.exit()
  },
})

/*
 * Hot-code reloading
 */

fs.watch(srcDir, { recursive: true }, (event: string, fileName: string | null) => {
  if (fileName && fileName.endsWith('.ts')) {
    loadModule(server, path.join(srcDir, fileName))
  }
  server.displayPrompt()
})
