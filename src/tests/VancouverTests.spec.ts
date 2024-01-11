import { checkIfApplication, parseApplication } from '../rezonings/cities/Vancouver/Applications'
import { checkIfPublicHearing } from '../rezonings/cities/Vancouver/PublicHearings'
import { checkIfBylaw } from '../rezonings/cities/Vancouver/Bylaws'

const sampleScrapedRezoningApplication = {
  "city": "Vancouver",
  "metroCity": "Metro Vancouver",
  "url": "https://council.vancouver.ca/20221206/regu20221206ag.htm",
  "minutesUrl": "https://council.vancouver.ca/20221206/regu20221206ag.htm",
  "date": "2022-12-06",
  "meetingType": "Council",
  "title": "CD-1 Rezoning: 3575-3655 Kaslo Street, 3580-3644 Slocan Street and 2755 East 21st Avenue",
  "resolutionId": null,
  "contents": "",
  "reportUrls": [
    {
      "title": "Referral Report",
      "url": "https://council.vancouver.ca/20221206/documents/rr1.pdf"
    }
  ]
}

test('Vancouver rezoning application checkIfApplication', () => {
  expect(checkIfApplication(sampleScrapedRezoningApplication)).toBe(true)
})

const sampleScrapedPublicHearing = {
  "city": "Vancouver",
  "metroCity": "Metro Vancouver",
  "url": "https://council.vancouver.ca/20211014/phea20211014ag.htm",
  "minutesUrl": "https://council.vancouver.ca/20211014/phea20211014ag.htm",
  "date": "2021-10-14",
  "meetingType": "Public Hearing",
  "title": "Rezoning: 328-360 West 2nd Avenue",
  "resolutionId": null,
  "contents": "",
  "reportUrls": [
    {
      "title": "Summary and Recommendations",
      "url": "https://council.vancouver.ca/20211014/documents/phea1summary.pdf"
    },
    {
      "title": "Draft By-law - Zoning and Development",
      "url": "https://council.vancouver.ca/20211014/documents/phea1draftbylawZD.pdf"
    },
    {
      "title": "Referral Report dated September 7, 2021",
      "url": "https://council.vancouver.ca/20210921/documents/rr5.pdf"
    },
    {
      "title": "Staff Presentation",
      "url": "https://council.vancouver.ca/20211014/documents/phea1staffpresentation.pdf"
    },
    {
      "title": "Video Clip of this Item",
      "url": "https://bit.ly/3jpTdzp"
    }
  ]
}

test('Vancouver public hearing checkIfPublicHearing', () => {
  expect(checkIfPublicHearing(sampleScrapedPublicHearing)).toBe(true)
})

const sampleScrapedBylaw = {
  "city": "Vancouver",
  "metroCity": "Metro Vancouver",
  "url": "https://council.vancouver.ca/20220621/regu20220621ag.htm",
  "minutesUrl": "https://council.vancouver.ca/20220621/regu20220621ag.htm",
  "date": "2022-06-21",
  "meetingType": "Council",
  "title": "By-laws",
  "resolutionId": null,
  "contents": "",
  "reportUrls": [
    {
      "title": "By-laws 1 to 46",
      "url": "https://council.vancouver.ca/20220621/documents/bylaws1to46.pdf"
    }
  ]
}


test('Vancouver bylaw checkIfBylaw', () => {
  expect(checkIfBylaw(sampleScrapedBylaw)).toBe(true)
})

// test('async test', async function() {
//   const results = await parseApplication({
//     "city": "Vancouver",
//     "metroCity": "Metro Vancouver",
//     "url": "https://council.vancouver.ca/20220517/regu20220517ag.htm",
//     "minutesUrl": "https://council.vancouver.ca/20220517/regu20220517ag.htm",
//     "date": "2022-05-17",
//     "meetingType": "Council",
//     "title": "CD-1 Rezoning: 1406-1410 East King Edward Avenue",
//     "resolutionId": null,
//     "contents": "",
//     "reportUrls": [
//       {
//         "title": "Referral Report",
//         "url": "https://council.vancouver.ca/20220517/documents/rr13.pdf"
//       }
//     ]
//   })
//   console.log(JSON.stringify(results, null, 2))
// }, 30000)
