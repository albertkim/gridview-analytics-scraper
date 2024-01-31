import { parseBylaw } from '../../rezonings/cities/Richmond/Bylaws'
import { parseApplication } from '../../rezonings/cities/Vancouver/Applications'

(async () => {

  const news = {
    "city": "Vancouver",
    "metroCity": "Metro Vancouver",
    "url": "https://council.vancouver.ca/20240123/regu20240123ag.htm",
    "minutesUrl": "https://council.vancouver.ca/20240123/regu20240123ag.htm",
    "date": "2024-01-23",
    "meetingType": "Council",
    "title": "Rezoning: 2726-2734 West 16th Avenue",
    "resolutionId": null,
    "contents": "",
    "reportUrls": [
      {
        "title": "Referral Report",
        "url": "https://council.vancouver.ca/20240123/documents/rr2.pdf"
      }
    ]
  }

  const parsed = await parseApplication(news)
  console.log(parsed)

})()
