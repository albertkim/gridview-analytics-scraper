import fs from 'fs'
import path from 'path'

const directory = path.join(__dirname, '../database/pdfs.json')

interface IPDFItem {
  url: string
  text: string | null // If null there was an error parsing the PDF, need to investigate
  maxPages: number // 0 if entire document
  pages: number[] // [] if no specific pages were specified
  type: 'text' | 'image'
  createDate: string
  updateDate: string
}

export const PDFRepository = {

  check(url: string, options: {maxPages?: number, pages?: number[]}): string | null {

    const pdfs = JSON.parse(fs.readFileSync(directory, 'utf8')) as IPDFItem[]

    const matchingURL = pdfs.find((item) => item.url === url)

    if (!matchingURL) {
      return null
    }

    // Check that the matching item's maxPages is less than or equal to the options.maxPages
    if (options.maxPages) {
      if (options.maxPages <= matchingURL.maxPages) {
        return matchingURL.text
      } else {
        return null
      }
    }

    // Check that the matching item's pages array is a subset of the options.pages array
    if (options.pages) {
      if (options.pages.every((page) => matchingURL.pages.includes(page))) {
        return matchingURL.text
      } else {
        return null
      }
    }

    return matchingURL.text

  },

  add(url: string, text: string | null, options: {maxPages?: number, pages?: number[]}, type: 'text' | 'image') {

    const pdfs = JSON.parse(fs.readFileSync(directory, 'utf8')) as IPDFItem[]

    const matchingURL = pdfs.find((item) => item.url === url)

    if (!matchingURL) {
      const newPDFs: IPDFItem[] = [{
        url: url,
        text: text,
        maxPages: options.maxPages || 0,
        pages: options.pages || [],
        type: type,
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString()
      }, ...pdfs]
      fs.writeFileSync(directory, JSON.stringify(newPDFs, null, 2), 'utf8')
      return
    }

    if (options.maxPages && options.maxPages > matchingURL.maxPages) {

      // If the incoming maxPages is greater than the existing maxPages, update existing entry
      matchingURL.text = text
      matchingURL.maxPages = options.maxPages
      matchingURL.type = type
      matchingURL.updateDate = new Date().toISOString()
      fs.writeFileSync(directory, JSON.stringify(pdfs, null, 2), 'utf8')

    } else if (options.pages && options.pages.length > matchingURL.pages.length) {

      // If the incoming pages array is a superset of the existing pages array, update existing entry
      matchingURL.text = text
      matchingURL.pages = options.pages
      matchingURL.type = type
      matchingURL.updateDate = new Date().toISOString()
      fs.writeFileSync(directory, JSON.stringify(pdfs, null, 2), 'utf8')

    }

  }

}
