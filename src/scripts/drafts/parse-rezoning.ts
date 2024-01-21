import { parseBylaw } from '../../rezonings/cities/Richmond/Bylaws'
import { parseApplication } from '../../rezonings/cities/Vancouver/Applications'

(async () => {

  const news = {
    "city": "Vancouver",
    "metroCity": "Metro Vancouver",
    "url": "https://council.vancouver.ca/20231114/regu20231114ag.htm",
    "minutesUrl": "https://council.vancouver.ca/20231114/regu20231114ag.htm",
    "date": "2023-11-14",
    "meetingType": "Council",
    "title": "CD-1 Rezoning: 4330-4408 Arbutus Street and 2092 Nanton Avenue",
    "resolutionId": null,
    "contents": "",
    "reportUrls": [
      {
        "title": "Referral Report",
        "url": "https://council.vancouver.ca/20231114/documents/rr9.pdf"
      }
    ]
  }

  const parsed = await parseApplication(news)
  console.log(parsed)

})()
