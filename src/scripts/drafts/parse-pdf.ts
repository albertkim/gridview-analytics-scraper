import fs from 'fs'
import path from 'path'
import { downloadPDF, generatePDFTextArray, generateScreenshotFromPDF, parsePDF } from '../../rezonings/PDFUtilities'
import { chatGPTJSONQuery, imageJSONQuery } from '../../rezonings/AIUtilities'
import { AIGetPartialRecords, AISummarizeDocument } from '../../rezonings/AIUtilitiesV2'
import { parseCleanPDF } from '../../rezonings/PDFUtilitiesV2'

/**
 * Sample PDFs:
 * Encrypted: https://citycouncil.richmond.ca/__shared/assets/1_Application_11230_WilliamsRd_PH_02222261140.pdf
 * Image based: https://citycouncil.richmond.ca/__shared/assets/1_dpp_ketcheson_road69357.pdf
 * Regular text-based: https://citycouncil.richmond.ca/__shared/assets/1_DP_18-824566_12700___12800_Rice_Mill_Rd_and_12280___12300_No70716.pdf
 */

(async () => {

  const pdfUrl = 'https://citycouncil.richmond.ca/__shared/assets/1_Application_11230_WilliamsRd_PH_02222261140.pdf'

  const parsed = await parseCleanPDF(pdfUrl, {maxPages: 2})

  console.log(parsed)

})()
