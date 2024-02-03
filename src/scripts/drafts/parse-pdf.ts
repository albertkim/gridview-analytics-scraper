import fs from 'fs'
import path from 'path'
import { downloadPDF, parsePDF } from '../../rezonings/PDFUtilities'
import { chatGPTTextQuery } from '../../rezonings/AIUtilities'
import { AIGetPartialRecords, AISummarizeDocument } from '../../rezonings/AIUtilitiesV2'

(async () => {

  const pdfUrl = 'https://citycouncil.richmond.ca/__shared/assets/2_dpp_092723_DP_22-011557_6531_Francis_Rd69479.pdf'

  const pdfData = await downloadPDF(pdfUrl)
  let parsed = await parsePDF(pdfData, 2)

  console.log(parsed)

})()
