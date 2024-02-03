import fs from 'fs'
import path from 'path'
import { downloadPDF, parsePDF } from '../../rezonings/PDFUtilities'
import { chatGPTTextQuery } from '../../rezonings/AIUtilities'
import { AIGetPartialRecords, AISummarizeDocument } from '../../rezonings/AIUtilitiesV2'

(async () => {

  const pdfUrl = 'https://citycouncil.richmond.ca/__shared/assets/Item_1_4831_Steveston_Highway70894.pdf'

  const pdfData = await downloadPDF(pdfUrl)
  let parsed = await parsePDF(pdfData, 1)

  console.log(parsed)

})()
