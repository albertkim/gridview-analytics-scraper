import axios from 'axios'
import pdfParse from 'pdf-parse'
import pdf2img from 'pdf-img-convert'
import chalk from 'chalk'
import { chatGPTTextQuery, imageTextQuery } from './AIUtilities'
import { PDFRepository } from '../repositories/PDFRepository'
import { cleanString } from '../scraper/BulkUtilities'
import { PDFDocument } from 'pdf-lib'

interface IParsePDFOptions {
  maxPages: number // Required: 0 means parse all pages, 1 means parse only the first page, etc
  expectedWords?: string[]
}

/**
 * Sample PDFs:
 * Encrypted: https://citycouncil.richmond.ca/__shared/assets/1_Application_11230_WilliamsRd_PH_02222261140.pdf
 * Image based: https://citycouncil.richmond.ca/__shared/assets/1_dpp_ketcheson_road69357.pdf
 * Regular text-based: https://citycouncil.richmond.ca/__shared/assets/1_DP_18-824566_12700___12800_Rice_Mill_Rd_and_12280___12300_No70716.pdf
 * Long PDF: https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=74269
 */

/**
 * V2 of the parsePDF function. Returns an array of strings, one for each page of the PDF. Caller can choose to join or keep separate.
 * Features:
 * 1. Handle view-only encrypted PDFs - if a PDF is encrypted in a way that you can still view, it will still work
 * 2. Handle image-based PDFs - if a PDF is image-based, it will use Google Cloud Vision OCR to extract the text
 * 3. Clean output - it will use GPT 3.5 to clean the text
 * 4. Never re-download/re-parse a PDF twice - it will cache the parsed text in a pdfs.json, helpful for re-running scripts
 */
export async function parseCleanPDF(url: string, options: IParsePDFOptions) {

  const cached = PDFRepository.check(url, options.maxPages)

  if (cached) {
    return cached
  }

  const pdfData = await downloadPDF(url)

  const parseResult = await pdfParse(pdfData, {
    max: options.maxPages
  })

  let parsedPDF = cleanString(parseResult.text)

  // Check to see if image-based by using regex to get only letters and numbers, and making sure that the length is greater than 50 characters
  const isImageBased = !parsedPDF.match(/[a-z0-9]/i) || parsedPDF.length < 50

  // If image based, use Google Cloud Vision OCR to extract the text for each page index
  if (isImageBased) {

    // Clear the parsed PDF because it doesn't contain any useful data
    parsedPDF = ''

    for (let i = 0; i < options.maxPages; i++) {
      const screenshot = await generateScreenshotFromPDF(pdfData, i)
      const text = await imageTextQuery(`
        Clean and format the following text extracted from a PDF document. Retain original information, do not summarize. Only give me the results, do not explain anything.
        Here is the document:
      `, screenshot)
      parsedPDF += text
    }

  }

  let finalText: string | null = ''

  // Chunk the text into 2500 character chunks with a 500 character overlap between the chunks to avoid GPT 3.5's token limit, avoid splitting words
  console.log(`Parsed PDF length is ${parsedPDF.length}`)
  let chunkedText = chunkTextWithOverlapAvoidingWordSplit(parsedPDF, 8000, 100)

  // Can realistically have a max of 3 chunks before things get very unwieldy
  chunkedText = chunkedText.slice(0, 3)

  if (chunkedText.length > 1) {
    console.log(`Chunked text into ${chunkedText.length} chunks`)
  }

  for (const chunk of chunkedText) {
    const chunkSummary = await chatGPTTextQuery(`
      You are cleaning and formatting PDF document to be easy to read. You must retain original information, do not summarize. Shorten sentences without losing information. Only give me the results, do not explain anything.

      Here is the document:
      ${chunk}
    `)
    if (chunkSummary) {
      finalText += `${chunkSummary}\n`
    } else {
      console.log(chalk.red(`Failed to get a summary for the chunk: ${chunk} for the PDF at ${url}`))
    }
  }

  PDFRepository.add(url, finalText, options.maxPages, isImageBased ? 'image' : 'text')
  return finalText

}

interface IGeneratePDFTextArrayOptions {
  minCharacterCount?: number
  expectedWords?: string[]
}

// Given a PDF file, return a new text array with only the pages that have selectable text, no smart functionality
// IMPORTANT: This DOES NOT WORK with encrypted PDFs. For encrypted PDFs, use parsePDF() directly with the maxPages parameter instead
export async function parsePDFAsRawArray(url: string, options: IGeneratePDFTextArrayOptions = {}) {

  const pdfData = await downloadPDF(url)

  const minCharacterCount = options.minCharacterCount || 5
  const expectedWords = options.expectedWords || []
  const pdfDoc = await PDFDocument.load(pdfData)
  const pageCount = pdfDoc.getPageCount()

  const finalPDFTextArray = []

  for (let i = 0; i < pageCount; i++) {
    // For each page, create a new single-page PDF to parse text
    const singlePagePDF = await PDFDocument.create()
    const [copiedPage] = await singlePagePDF.copyPages(pdfDoc, [i])
    singlePagePDF.addPage(copiedPage)
    const singlePagePDFBytes = await singlePagePDF.save()
    const pageText = (await pdfParse(singlePagePDFBytes as Buffer)).text
    const cleanedText = cleanString(pageText)
    if (cleanedText.length > minCharacterCount && expectedWords.every(word => cleanedText.toLowerCase().includes(word.toLowerCase()))) {
      finalPDFTextArray.push(cleanedText)
    }
  }

  return finalPDFTextArray

}

// Download a PDF from a URL and return the data
export async function downloadPDF(url: string) {
  // console.log(`Downloading PDF from ${url}`)
  const response = await axios.get(url, {
    responseType: 'arraybuffer'
  })
  // console.log(`Downloaded, file size is ${Math.round(response.data.length / 1024)} kb`)
  return response.data
}

interface IGeneratePDFTextArrayOptions {
  minCharacterCount?: number
  expectedWords?: string[]
}

// Given a PDF file, return an JPEG image file of the page at the given index
async function generateScreenshotFromPDF(pdfData: Uint8Array, pageIndex: number) {
  const screenshot = await pdf2img.convert(pdfData, {
    page_numbers: [pageIndex + 1],
    base64: true
  })
  const fileSize = Math.round(screenshot[0].length / 1024)
  console.log(`Generated. PDF screenshot file size is ${fileSize} kb`)

  return screenshot[0] as string
}

function chunkTextWithOverlapAvoidingWordSplit(text: string, chunkSize: number, overlap: number) {
  let chunks = []
  let index = 0

  while (index < text.length) {
    let end = index + chunkSize // Set end of chunk
    let isLastChunk = end >= text.length // Check if this will be the last chunk

    // If not the last chunk, adjust end to avoid splitting words
    if (!isLastChunk) {
      let boundaryIndex = Math.min(end + overlap, text.length) // Limit search to within overlap range
      let lastSpaceIndex = text.lastIndexOf(' ', boundaryIndex)
      end = lastSpaceIndex !== -1 ? lastSpaceIndex : end // Adjust end if space found, else keep end
    }

    let chunk = text.substring(index, end).trim() // Extract chunk and trim any leading/trailing whitespace
    chunks.push(chunk)

    // Update index for next chunk, ensuring overlap by only moving forward by (chunkSize - overlap) if not the first iteration
    index = (index === 0) ? end : end - overlap
  }

  return chunks
}
