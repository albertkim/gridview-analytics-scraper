import fs from 'fs'
import path from 'path'

const directory = path.join(__dirname, '../database/pdfs.json')

interface IPDFItem {
  url: string
  text: string | null // If null there was an error parsing the PDF, need to investigate
  maxPages: number // 0 if entire document
  createDate: string
  updateDate: string
}

export const PDFRepository = {

  check(url: string, maxPages?: number): string | null {

    const pdfs = JSON.parse(fs.readFileSync(directory, 'utf8')) as IPDFItem[]

    const existing = pdfs.find((item) => item.url === url)

    if (existing && maxPages && (maxPages <= existing.maxPages)) {
      return existing.text
    } else if (existing) {
      // If the caller expects data from a greater number of pages, return null
      return null
    } else {
      return null
    }

  },

  add(url: string, text: string | null, maxPages: number) {

    const pdfs = JSON.parse(fs.readFileSync(directory, 'utf8')) as IPDFItem[]

    const existing = pdfs.find((item) => item.url === url)

    if (existing && maxPages > existing.maxPages) {
      // If there is an existing URL match with lowermaxPages, update
      existing.text = text
      existing.maxPages = maxPages
      existing.updateDate = new Date().toISOString()
      fs.writeFileSync(directory, JSON.stringify(pdfs, null, 2), 'utf8')
    } else if (existing && maxPages <= existing.maxPages) {
      // If there is an existing URL match with higher maxPages, do nothing
      return
    } else {
      // If there is no existing URL match, add new
      const newPDFs = [{url: url, text: text, maxPages: maxPages, createDate: new Date().toISOString(), updateDate: new Date().toISOString()}, ...pdfs]
      fs.writeFileSync(directory, JSON.stringify(newPDFs, null, 2), 'utf8')
    }

  }

}
