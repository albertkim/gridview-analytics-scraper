// The purpose of this function is to return a formatted application ID from a messy content string using a template.
// Clean the content string to remove any characters that are not letters, numbers, '#', or '-'
// Then build a regex pattern that matches the template, but ignores spaces in the template and interprets 'X' as a number
// Search for matches in the cleaned content and extract the digits
// Finally, format the final output should exactly match the format (ex. DP 12-123456) from a content input (ex. DP12-123456 or DP \n12-123456)
export function findApplicationIDsFromTemplate(template: string, content: string): string[] {

  // Clean the content string to remove any characters that are not letters, numbers, or '-'
  const cleanedContent = content.replace(/[^A-Za-z0-9-]/g, '')

  // Build a regex pattern that matches the template, but ignores spaces/# in the template and interprets 'X' as a number
  const regexPattern = template.replace(' ', '').replace('#', '').replace('.', '').split('').map((char) => {
    if (char === 'X') {
      return '[0-9]'
    } else {
      return char
    }
  }).join('')

  // Search for matches in the cleaned content and extract the digits case insensitive
  const matches = cleanedContent.match(new RegExp(regexPattern, 'gi'))

  if (matches) {

    const finalApplicationIds: string[] = []

    for (const match of matches) {

      // Iterate through each character in the template - find the matching character in the match and extract the digits, but if template has a space, add a space and do not increment the match index
      let matchIndex = 0
      let applicationId = ''
      for (const char of template) {
        if (char === ' ') {
          applicationId += ' '
        } else if (char === '#') {
          applicationId += '#'
        } else if (char === '.') {
          applicationId += '.'
        } else if (char === 'X') {
          applicationId += match[matchIndex]
          matchIndex++
        } else {
          applicationId += char
          matchIndex++
        }
      }

      finalApplicationIds.push(applicationId)

    }

    // Only return unique instances of final application IDs
    return [...new Set(finalApplicationIds)]

  } else {

    return []

  }

}
