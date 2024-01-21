import { checkIfBylaw, parseBylaw } from '../../rezonings/cities/Vancouver/Bylaws'

(async () => {

  const bylaw = {
    "city": "Vancouver",
    "metroCity": "Metro Vancouver",
    "url": "https://council.vancouver.ca/20231212/regu20231212ag.htm",
    "minutesUrl": "https://council.vancouver.ca/20231212/regu20231212ag.htm",
    "date": "2023-12-12",
    "meetingType": "Council",
    "title": "By-laws",
    "resolutionId": null,
    "contents": "",
    "reportUrls": [
      {
        "title": "By-laws 1 to 27",
        "url": "https://council.vancouver.ca/20231212/documents/bylaws1to27.pdf"
      },
      {
        "title": "By-law 16",
        "url": "https://council.vancouver.ca/20231212/documents/bylaw16revised.pdf"
      },
      {
        "title": "By-law 23",
        "url": "https://council.vancouver.ca/20231212/documents/bylaw23.pdf"
      }
    ]
  }

  const check = await checkIfBylaw(bylaw)
  console.log(check)

  const results = await parseBylaw(bylaw)

  console.log(results)

})()
