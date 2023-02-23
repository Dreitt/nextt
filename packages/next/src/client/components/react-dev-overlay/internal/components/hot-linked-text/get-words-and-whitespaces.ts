function isWhitespace(char: string) {
  return char === ' ' || char === '\n'
}

/**
 * Get sequences of words and whitespaces from a string.
 *
 * e.g. "Hello world \n\n" -> ["Hello", " ", "world", " \n\n"]
 */
export function getWordsAndWhitespaces(text: string) {
  const wordsAndWhitespaces: string[] = []

  let current = ''
  let currentIsWhitespace = false
  for (const char of text) {
    if (current.length === 0) {
      current += char
      currentIsWhitespace = isWhitespace(char)
      continue
    }

    const nextIsWhitespace = isWhitespace(char)
    if (currentIsWhitespace === nextIsWhitespace) {
      current += char
    } else {
      wordsAndWhitespaces.push(current)
      current = char
      currentIsWhitespace = nextIsWhitespace
    }
  }

  if (current.length > 0) {
    wordsAndWhitespaces.push(current)
  }

  return wordsAndWhitespaces
}
