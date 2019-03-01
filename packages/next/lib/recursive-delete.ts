import fs from 'fs'
import { join } from 'path'
import { promisify } from 'util'

const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)
const rmdir = promisify(fs.rmdir)
const unlink = promisify(fs.unlink)

/**
 * Recursively delete directory contents
 * @param  {string} dir Directory to delete the contents of
 * @param  {RegExp} filter Filter for the file name, only the name part is considered, not the full path
 * @returns Promise void
 */
export async function recursiveDelete(dir: string, filter?: RegExp, ensure?: boolean): Promise<void> {
  let result
  try {
    result = await readdir(dir)
  } catch (e) {
    if (ensure) throw e
    // If the dir does not exist we dont need to do anything
    return
  }

  await Promise.all(result.map(async (part: string) => {
    const absolutePath = join(dir, part)
    const pathStat = await stat(absolutePath)

    if (pathStat.isDirectory()) {
      return recursiveDelete(absolutePath, filter).then(async () => await rmdir(absolutePath))
    }

    if (!filter || filter.test(part)) {
      await unlink(absolutePath)
    }
  }))
}
