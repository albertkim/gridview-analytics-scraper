import { parsePDFAsRawArray } from '../../utilities/PDFUtilitiesV2'

// Vancouver Bylaw PDF (many items): https://council.vancouver.ca/20230725/documents/By-laws1to18_000.pdf
(async () => {

  const pdfUrl = 'https://www.burnaby.ca/sites/default/files/acquiadam/2024-02/February-1-2024.pdf'

  const pdfArray = await parsePDFAsRawArray(pdfUrl)

  console.log(pdfArray.slice(0, 2))

})()
