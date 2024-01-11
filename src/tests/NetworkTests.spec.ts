import fs from 'fs'
import pdf2img from 'pdf-img-convert'
import { downloadPDF, generatePDF, generateScreenshotFromPDF, parsePDF } from '../rezonings/PDFUtilities'
import { chatGPTTextQuery, getGPTBaseRezoningQuery, imageQuery } from '../rezonings/AIUtilities'

test.skip('Test Richmond encrypted PDF text parse', async () => {
  const pdfUrl = 'https://citycouncil.richmond.ca/__shared/assets/1_Application_11230_WilliamsRd_PH_02222261140.pdf'
  const pdfData = await downloadPDF(pdfUrl)
  const parsedPDF = await parsePDF(pdfData as Buffer, 2)
  console.log(parsedPDF)
}, 30000)
