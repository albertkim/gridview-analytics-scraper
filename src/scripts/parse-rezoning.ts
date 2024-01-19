import { parseBylaw } from '../rezonings/cities/Richmond/Bylaws'

(async () => {

  const news = {
    "city": "Richmond",
    "metroCity": "Metro Vancouver",
    "url": "http://citycouncil.richmond.ca/decisions/search/permalink/15528/",
    "date": "2023-11-27",
    "meetingType": "Council Minutes",
    "title": "BYLAW FOR ADOPTION - BYLAW 10155",
    "resolutionId": "R23/20-9",
    "contents": "R23/20-9Outcome: It was moved and seconded That Richmond Official Community Plan Bylaw 7100, Amendment Bylaw No. 10155 (10140, 10160, 10180 No 1 Rd and 4051 & 4068 Cavendish Drive, RZ 18-820669) be adopted. CARRIED Opposed: Cllr. Wolfe",
    "minutesUrl": "https://citycouncil.richmond.ca/agendas/council/112723_minutes.htm",
    "reportUrls": [
      {
        "title": "Report",
        "url": "https://citycouncil.richmond.ca/__shared/assets/Bylaw_1015570857.pdf"
      }
    ]
  }

  const parsed = await parseBylaw(news)
  console.log(parsed)

})()
