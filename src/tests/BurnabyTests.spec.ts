import { cleanBurnabyRezoningId } from '../rezonings/cities/Burnaby/BurnabyUtilities'
import { checkIfApplication, parseApplication } from '../rezonings/cities/Burnaby/Applications'

test('Burnaby ID cleaning', async () => {
  
  const shouldBeValid = '  REZ  #44-99'
  const shouldBeValidCleaned = cleanBurnabyRezoningId(shouldBeValid)
  expect(shouldBeValidCleaned).toEqual('REZ #44-99')

  const shouldBeInvalid = ' REZ 44-9999'
  const shouldBeInvalidCleaned = cleanBurnabyRezoningId(shouldBeInvalid)
  expect(shouldBeInvalidCleaned).toEqual(null)

})

const realScrapedNews = {
  "city": "Burnaby",
  "metroCity": "Metro Vancouver",
  "url": "https://pub-burnaby.escribemeetings.com/Meeting.aspx?Id=cb5a58a2-1bfa-4dc0-87e4-d48189b25d62&Agenda=Agenda&lang=English&Item=59&Tab=attachments",
  "date": "2023-12-11",
  "meetingType": "City council",
  "title": "REZ #20-09 - 3777 AND 3791 KINGSWAY - HIGH-DENSITY MIXED-USE DEVELOPMENT",
  "resolutionId": null,
  "contents": "Purpose: To seek Council authorization to forward this application to First Reading and to a future Public Hearing date, if necessary.",
  "reportUrls": [
    {
      "title": "REZ 20-09 3777 and 3791 Kingsway PH Report 2023-12-11.pdf",
      "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=73390"
    },
    {
      "title": "Attachment 1 - REZ 20-09 - Sketch 1 and Sketch 2 .pdf",
      "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=73391"
    }
  ],
  "minutesUrl": "https://pub-burnaby.escribemeetings.com/Meeting.aspx?Id=cb5a58a2-1bfa-4dc0-87e4-d48189b25d62&lang=English"
}

test('Burnaby check application', async () => {

  const isApplication = await checkIfApplication(realScrapedNews)
  expect(isApplication).toEqual(true)

})

test.skip('Burnaby parse application', async () => {
  
  const rezoning = await parseApplication(realScrapedNews)

  if (!rezoning) {
    expect(rezoning).not.toEqual(null)
    return
  }

  expect(rezoning.rezoningId).toEqual('REZ #20-09')
  expect(rezoning.city).toEqual('Burnaby')
  expect(rezoning.metroCity).toEqual('Metro Vancouver')
  expect(rezoning.address.toLowerCase()).toContain('3777')
  expect(rezoning.address.toLowerCase()).toContain('3791')
  expect(rezoning.address.toLowerCase()).toContain('kingsway')
  expect(rezoning.status).toEqual('applied')
  expect(rezoning.type).toEqual('mixed use')
  expect(rezoning.urls.length).toEqual(2)
  rezoning.urls.forEach((url) => {
    expect(url.type).toEqual('application')
  })
  expect(rezoning.minutesUrls.length).toEqual(1)
  expect(rezoning.dates.appliedDate).toEqual('2023-12-11')

}, 60000)
