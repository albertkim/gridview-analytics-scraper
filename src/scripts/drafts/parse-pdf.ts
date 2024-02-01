import fs from 'fs'
import path from 'path'
import { downloadPDF, parsePDF } from '../../rezonings/PDFUtilities'

(async () => {

  const pdfUrl = 'https://citycouncil.richmond.ca/__shared/assets/Dec_13_DPP_Chairs_report70971.pdf'

  const pdfData = await downloadPDF(pdfUrl)
  let parsed = await parsePDF(pdfData, 2)

  console.log(parsed)

})()
