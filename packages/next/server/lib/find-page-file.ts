import { join, sep as pathSeparator, normalize } from 'path'
import chalk from 'chalk'
import { warn } from '../../build/output/log'
import { promises, constants as fsConstants } from 'fs'
import { denormalizePagePath } from '../../next-server/server/normalize-page-path'

async function isTrueCasePagePath(pagePath: string, pagesDir: string) {
  const pageSegments = normalize(pagePath).split(pathSeparator).filter(Boolean)

  const segmentExistsPromises = pageSegments.map(async (segment, i) => {
    const segmentParentDir = join(pagesDir, ...pageSegments.slice(0, i))
    const parentDirEntries = await promises.readdir(segmentParentDir)
    return parentDirEntries.includes(segment)
  })

  return (await Promise.all(segmentExistsPromises)).every(Boolean)
}

async function isReadable(directory: string): Promise<boolean> {
  try {
    await promises.access(directory, fsConstants.R_OK)
    return true
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false
    }
    throw err
  }
}

export async function findPageFile(
  rootDir: string,
  normalizedPagePath: string,
  pageExtensions: string[]
): Promise<string | null> {
  const foundPagePaths: string[] = []

  const page = denormalizePagePath(normalizedPagePath)

  for (const extension of pageExtensions) {
    if (!normalizedPagePath.endsWith('/index')) {
      const relativePagePath = `${page}.${extension}`
      const pagePath = join(rootDir, relativePagePath)

      if (await isReadable(pagePath)) {
        foundPagePaths.push(relativePagePath)
      }
    }

    const relativePagePathWithIndex = join(page, `index.${extension}`)
    const pagePathWithIndex = join(rootDir, relativePagePathWithIndex)
    if (await isReadable(pagePathWithIndex)) {
      foundPagePaths.push(relativePagePathWithIndex)
    }
  }

  if (foundPagePaths.length < 1) {
    return null
  }

  if (!(await isTrueCasePagePath(foundPagePaths[0], rootDir))) {
    return null
  }

  if (foundPagePaths.length > 1) {
    warn(
      `Duplicate page detected. ${chalk.cyan(
        join('pages', foundPagePaths[0])
      )} and ${chalk.cyan(
        join('pages', foundPagePaths[1])
      )} both resolve to ${chalk.cyan(normalizedPagePath)}.`
    )
  }

  return foundPagePaths[0]
}
