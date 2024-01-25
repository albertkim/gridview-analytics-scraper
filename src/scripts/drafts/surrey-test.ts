import fs from 'fs'
import path from 'path'
import { parseSurreyMeetingMinutes } from '../../scraper/cities/Surrey/SurreyUtilities'
import { downloadPDF, parsePDF } from '../../rezonings/PDFUtilities'

(async () => {

  const surreyMinutes = 'https://www.surrey.ca/sites/default/files/minutes/MIN_RCLU_2022-11-28.pdf'

  const pdfData = await downloadPDF(surreyMinutes)
  const pdfRawText = await parsePDF(pdfData)

  fs.writeFileSync(path.join(__dirname, 'surrey-test-raw.txt'), pdfRawText)  

  const parsedDoc = await parseSurreyMeetingMinutes(surreyMinutes)

  fs.writeFileSync(path.join(__dirname, 'surrey-test-parsed.json'), JSON.stringify(parsedDoc, null, 2))  

})()
