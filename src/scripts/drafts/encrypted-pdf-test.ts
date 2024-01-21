import fs from 'fs'
import path from 'path'
import pdf2img from 'pdf-img-convert'
import { downloadPDF, generatePDF, generateScreenshotFromPDF, parsePDF } from '../../rezonings/PDFUtilities'
import { chatGPTTextQuery, getGPTBaseRezoningQuery, imageQuery } from '../../rezonings/AIUtilities'

(async function() {
  try {

    const nonEncryptedPDFUrl = 'https://citycouncil.richmond.ca/__shared/assets/2_Application_11320_WilliamsRd_CNCL_01102259849.pdf'
    try {
      const pdfData = await downloadPDF(nonEncryptedPDFUrl)
      const result = await parsePDF(pdfData)
      console.log(result.text)
    } catch (error) {
      console.log('Cannot parse non-encrypted PDF')
    }
    const nonEncryptedScreenshot = await pdf2img.convert(
      nonEncryptedPDFUrl,
      {
        page_numbers: [1]
      })

    fs.writeFileSync(path.join(__dirname, 'non-encrypted.png'), nonEncryptedScreenshot[0])

    const encryptedPDFUrl = 'https://citycouncil.richmond.ca/__shared/assets/1_Application_11230_WilliamsRd_PH_02222261140.pdf'
    try {
      const pdfData = await downloadPDF(encryptedPDFUrl)
      const result = await parsePDF(pdfData)
      console.log(result.text)
    } catch (error) {
      console.log('Cannot parse encrypted PDF')
    }
    const encryptedScreenshot = await pdf2img.convert(
      encryptedPDFUrl,
      {
        page_numbers: [1]
      })

    fs.writeFileSync(path.join(__dirname, 'encrypted.png'), encryptedScreenshot[0])

  } catch (error) {
    console.error(error)
  }
})()
