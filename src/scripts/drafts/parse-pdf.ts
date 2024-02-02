import fs from 'fs'
import path from 'path'
import { downloadPDF, parsePDF } from '../../rezonings/PDFUtilities'
import { chatGPTTextQuery } from '../../rezonings/AIUtilities'
import { AIGetPartialRecords, AISummarizeDocument } from '../../rezonings/AIUtilitiesV2'

(async () => {

  const pdfUrl = 'https://www.burnaby.ca/sites/default/files/acquiadam/2024-01/January-2-2024.pdf'

  const pdfData = await downloadPDF(pdfUrl)
  let parsed = await parsePDF(pdfData, 5)

  const response = await AIGetPartialRecords(parsed, 5, 'BLDXX-XXXXX', {
    introduction: 'Identify only the items that refer to new developments, not alterations. Number of units is usually a number listed right after the $ value',
    fieldsToAnalyze: ['building type', 'stats']
  })

  console.log(response)

})()
