import { downloadPDF, parsePDF } from '../../rezonings/PDFUtilities'

(async () => {

  const pdfUrl = 'https://www.surrey.ca/sites/default/files/minutes/MIN_RCPH_2023_12_04.pdf'

  const pdfData = await downloadPDF(pdfUrl)
  const parsed = await parsePDF(pdfData)

  console.log(parsed)

})()
