import { downloadPDF, generatePDF } from "../utilities"


const news = {
  "city": "Richmond",
  "metroCity": "Metro Vancouver",
  "url": "http://citycouncil.richmond.ca/decisions/search/permalink/14543/",
  "date": "March 28, 2022",
  "meetingType": "City council",
  "title": "APPLICATION BY PAKLAND PROPERTIES FOR REZONING AT 11720 WILLIAMS ROAD FROM THE “SINGLE DETACHED (RS1/E)” ZONE TO THE “COMPACT SINGLE DETACHED (RC2)” ZONE",
  "resolutionId": "R22/6-5",
  "contents": "R22/6-5Outcome: It was moved and seconded\n\nThat Richmond Zoning Bylaw 8500, Amendment Bylaw 10359, for the rezoning of 11720 Williams Road from the “Single Detached (RS1/E)” zone to the “Compact Single Detached (RC2)” zone, be introduced and given first reading.",
  "minutesUrl": "https://citycouncil.richmond.ca/agendas/archives/council/2022/032822_minutes.htm",
  "reportUrls": [
    {
      "title": "Report",
      "url": "https://citycouncil.richmond.ca/__shared/assets/1_Application_Pakland_Properties_PLN_03222261296.pdf"
    }
  ]
}

async function main() {

  try {
    const pdfData = await downloadPDF(news.reportUrls[0].url)
    const pdf3pages = await generatePDF(pdfData, {
      maxPages: 3
    })
  } catch (error) {
    console.error(error)
  }

  console.log('End')

}

main()
