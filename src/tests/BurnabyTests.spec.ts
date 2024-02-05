import { checkIfApplication, parseApplication } from '../rezonings/cities/Burnaby/Applications'
import { checkIfPublicHearing, parsePublicHearing } from '../rezonings/cities/Burnaby/PublicHearings'
import { checkIfBylaw, parseBylaw } from '../rezonings/cities/Burnaby/Bylaws'

const scrapedApplication = {
  "city": "Burnaby",
  "metroCity": "Metro Vancouver",
  "url": "https://pub-burnaby.escribemeetings.com/Meeting.aspx?Id=cb5a58a2-1bfa-4dc0-87e4-d48189b25d62&Agenda=Agenda&lang=English&Item=59&Tab=attachments",
  "date": "2023-12-11",
  "meetingType": "City Council Meeting",
  "title": "ADMINISTRATIVE REPORTS - REZ #20-09 - 3777 AND 3791 KINGSWAY - HIGH-DENSITY MIXED-USE DEVELOPMENT",
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

const scrapedPublicHearing = {
  "city": "Burnaby",
  "metroCity": "Metro Vancouver",
  "url": "https://pub-burnaby.escribemeetings.com/Meeting.aspx?Id=6ed401d8-4b6c-4215-9bdf-5bddd35ebd7f&Agenda=Agenda&lang=English&Item=6&Tab=attachments",
  "date": "2023-12-12",
  "meetingType": "Public Hearing",
  "title": "Burnaby Zoning Bylaw 1965, Amendment Bylaw No. 35, 2023 - Bylaw No. 14613",
  "resolutionId": null,
  "contents": "REZ #20-17 - A portion of 6229 Marine DriveFrom: CD Comprehensive Development District (based on the RM3r Multiple Family Residential District, and in accordance with the development guidelines prepared by the City under REZ #19-59)To: Amended CD Comprehensive Development District (based on the RM2 and RM2r Multiple Family Residential Districts, the Edmonds Town Centre Plan as guidelines, and in accordance with the revised development guidelines provided in Appendix A of the Rezoning Bylaw)Purpose: to establish development guidelines for the subject site to facilitate development of non-market housingApplicant: Mania Hormozi, CLT 0012 Community Society",
  "reportUrls": [
    {
      "title": "Revised REZ 20-17 Ptn 6229 Marine Drive PH Report (2023-11-20).pdf",
      "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=73290"
    }
  ],
  "minutesUrl": "https://pub-burnaby.escribemeetings.com/Meeting.aspx?Id=6ed401d8-4b6c-4215-9bdf-5bddd35ebd7f&lang=English"
}

const scrapedBylawApproved = {
  "city": "Burnaby",
  "metroCity": "Metro Vancouver",
  "url": "https://pub-burnaby.escribemeetings.com/Meeting.aspx?Id=cc4ab0c2-2dac-450f-8466-257b862a9e6b&Agenda=Agenda&lang=English&Item=39&Tab=attachments",
  "title": "RECONSIDERATION AND FINAL ADOPTION - #13924 - Burnaby Zoning Bylaw 1965, Amendment Bylaw No. 32, 2018 - Rez. #16-38 (7422 & 7270 Buller Avenue)",
  "resolutionId": null,
  "contents": "Purpose: to permit the construction of a three-storey stacked townhouse development (124 units) with full underground parking (Item 7(5), Manager's Report, Council 2018 November 19) Memorandum - Director Planning & Building - 2020 August 19",
  "reportUrls": [
    {
      "title": "13924.cd.pdf",
      "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=48137"
    },
    {
      "title": "Rezoning Reference 16-38 Final Adoption Memo 2020.08.24.pdf",
      "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=48138"
    }
  ],
  "date": "2020-08-24",
  "meetingType": "City Council Meeting",
  "minutesUrl": "https://pub-burnaby.escribemeetings.com/Meeting.aspx?Id=cc4ab0c2-2dac-450f-8466-257b862a9e6b&lang=English"
}

test('Burnaby check application', async () => {

  const isApplication = await checkIfApplication(scrapedApplication)
  expect(isApplication).toEqual(true)

})

test('Burnaby check public hearing', async () => {
  
  const isPublicHearing = await checkIfPublicHearing(scrapedPublicHearing)
  expect(isPublicHearing).toEqual(true)

})

test('Burnaby check bylaw - approved', async () => {

  const isBylaw = await checkIfBylaw(scrapedBylawApproved)
  expect(isBylaw).toEqual(true)

})

test.skip('Burnaby parse application', async () => {
  
  const rezonings = await parseApplication(scrapedApplication)

  expect(rezonings).toHaveLength(1)

  const rezoning = rezonings[0]

  expect(rezoning.applicationId).toEqual('REZ #20-09')
  expect(rezoning.city).toEqual('Burnaby')
  expect(rezoning.metroCity).toEqual('Metro Vancouver')
  expect(rezoning.address.toLowerCase()).toContain('3777')
  expect(rezoning.address.toLowerCase()).toContain('3791')
  expect(rezoning.address.toLowerCase()).toContain('kingsway')
  expect(rezoning.status).toEqual('applied')
  expect(rezoning.buildingType).toEqual('mixed use')
  expect(rezoning.reportUrls.length).toEqual(2)
  rezoning.reportUrls.forEach((url) => {
    expect(url.status).toEqual('applied')
  })
  expect(rezoning.minutesUrls.length).toEqual(1)
  expect(rezoning.dates.appliedDate).toEqual('2023-12-11')

}, 60000)
