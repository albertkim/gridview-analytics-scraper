import { downloadPDF } from './PDFUtilities'


interface IParsePDFOptions {
  maxPages?: number
  specificPages?: number[]
  expectedWords?: string[]
}

/**
 * Sample PDFs:
 * Encrypted: https://citycouncil.richmond.ca/__shared/assets/1_Application_11230_WilliamsRd_PH_02222261140.pdf
 * Image based: https://citycouncil.richmond.ca/__shared/assets/1_dpp_ketcheson_road69357.pdf
 * Regular text-based: https://citycouncil.richmond.ca/__shared/assets/1_DP_18-824566_12700___12800_Rice_Mill_Rd_and_12280___12300_No70716.pdf
 */

// A non-smart version of the parseCleanPDF function that always download and always returns the value as an array of strings
// Useful if you need content from specific pages
export async function parseRawPDF(url: string, options: IParsePDFOptions): Promise<string[]> {

  const pdfData = await downloadPDF(url)

}

/**
 * V2 of the parsePDF function. Returns an array of strings, one for each page of the PDF. Caller can choose to join or keep separate.
 * Features:
 * 1. Handle encrypted PDFs - if a PDF is encrypted in a way that you can still view, it will still work
 * 2. Handle image-based PDFs - if a PDF is image-based, it will use Google Cloud Vision OCR to extract the text
 * 3. Clean output - it will use GPT 3.5 to clean the text
 * 4. Never re-download/re-parse a PDF twice - it will cache the parsed text in a pdfs.json, helpful for re-running scripts
 */
export async function parseCleanPDF(url: string, maxPages: number, options: IParsePDFOptions) {

  const pdfData = await downloadPDF(url)

}
