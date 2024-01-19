import { RezoningsRepository } from '../repositories/RezoningsRepository'
import { downloadPDF, parsePDF } from '../rezonings/PDFUtilities'
import { checkIfBylaw, parseBylaw } from '../rezonings/cities/Richmond/Bylaws'


(async () => {

  const bylaw = {
    "city": "Richmond",
    "metroCity": "Metro Vancouver",
    "url": "http://citycouncil.richmond.ca/decisions/search/permalink/11389/",
    "date": "2019-02-11",
    "meetingType": "Council Minutes",
    "title": "BYLAWS FOR ADOPTION - BYLAWS 9947, 9959, 9684, 9878 AND 9918",
    "resolutionId": "R19/3-18",
    "contents": "Resolution: It was moved and seconded That the following bylaws be adopted: City Centre District Energy Utility Bylaw No. 9895, Amendment Bylaw No. 9947 Housing Agreement (6560, 6600, 6640 and 6700 No. 3 Road) Bylaw No. 9959 Richmond Zoning Bylaw No. 8500, Amendment Bylaw No. 9684 Richmond Zoning Bylaw No. 8500, Amendment Bylaw No. 9878 Richmond Zoning Bylaw No. 8500, Amendment Bylaw No. 9918Discussion ensued with regard to introducing a referral related to stratifying office space and Mayor Brodie suggested that introduction of such a referral would be more suitable in Planning Committee.",
    "minutesUrl": "https://citycouncil.richmond.ca/agendas/archives/council/2019/021119_minutes.htm",
    "reportUrls": [
      {
        "title": "Report",
        "url": "https://citycouncil.richmond.ca/__shared/assets/bl9895_CNCL_02111952771.pdf"
      },
      {
        "title": "Report",
        "url": "https://citycouncil.richmond.ca/__shared/assets/bl9959_CNCL_02111952773.pdf"
      },
      {
        "title": "Report",
        "url": "https://citycouncil.richmond.ca/__shared/assets/bl9684_CNCL_02111952769.pdf"
      },
      {
        "title": "Report",
        "url": "https://citycouncil.richmond.ca/__shared/assets/bl9878_CNCL_02111952770.pdf"
      },
      {
        "title": "Report",
        "url": "https://citycouncil.richmond.ca/__shared/assets/bl9918_CNCL_02111952772.pdf"
      }
    ]
  }

  const isBylaw = checkIfBylaw(bylaw)
  console.log(isBylaw)

  const data = await parseBylaw(bylaw)
  console.log(data)

})()
