import fs from 'fs'
import path from 'path'
import { downloadPDF, parsePDF } from '../../rezonings/PDFUtilities'

(async () => {

  const pdfUrl = 'https://www.surrey.ca/sites/default/files/planning-reports/PLR_7916-0225-00_2.pdf'

  const pdfData = await downloadPDF(pdfUrl)
  let parsed = await parsePDF(pdfData, 1)

  console.log(parsed)

})()
