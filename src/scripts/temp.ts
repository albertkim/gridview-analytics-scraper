import moment from 'moment'
import { RawRepository } from '../repositories/RawRepository'
import { RezoningsRepository } from '../repositories/RezoningsRepository'
import { parseApplication } from '../rezonings/cities/Vancouver/Applications'

(async () => {

  const parsedRezoning = await parseApplication({
    "city": "Vancouver",
    "metroCity": "Metro Vancouver",
    "url": "https://council.vancouver.ca/20230912/regu20230912ag.htm",
    "minutesUrl": "https://council.vancouver.ca/20230912/regu20230912ag.htm",
    "date": "2023-09-12",
    "meetingType": "Council",
    "title": "Rezoning: 2821-2869 East 49th Avenue",
    "resolutionId": null,
    "contents": "",
    "reportUrls": [
      {
        "title": "Referral Report",
        "url": "https://council.vancouver.ca/20230912/documents/rr4.pdf"
      }
    ]
  })

  console.log(parsedRezoning)

})()
