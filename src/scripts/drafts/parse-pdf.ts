import fs from 'fs'
import path from 'path'
import { downloadPDF, generatePDFTextArray, generateScreenshotFromPDF, parsePDF } from '../../utilities/PDFUtilities'
import { chatGPTJSONQuery, imageJSONQuery } from '../../utilities/AIUtilities'
import { AIGetPartialRecords, AISummarizeDocument } from '../../utilities/AIUtilitiesV2'
import { parseCleanPDF } from '../../utilities/PDFUtilitiesV2'

/**
 * Sample PDFs:
 * Encrypted: https://citycouncil.richmond.ca/__shared/assets/1_Application_11230_WilliamsRd_PH_02222261140.pdf
 * Image based: https://citycouncil.richmond.ca/__shared/assets/1_dpp_ketcheson_road69357.pdf
 * Regular text-based: https://citycouncil.richmond.ca/__shared/assets/1_DP_18-824566_12700___12800_Rice_Mill_Rd_and_12280___12300_No70716.pdf
 */

// Big Burnaby rezoning application PDF: https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=72966
// Vancouver Bylaw PDF (many items): https://council.vancouver.ca/20230725/documents/By-laws1to18_000.pdf

(async () => {

  const pdfUrl = 'https://citycouncil.richmond.ca/__shared/assets/1_Application_11230_WilliamsRd_PH_02222261140.pdf'

  const parsed = await parseCleanPDF(pdfUrl, {
    pages: [0, 1, 2]
  })

  console.log('Parsed')
  console.log(parsed)

  const summarized = await AISummarizeDocument(parsed!, [], null)

  console.log(summarized)

})()
