import { checkIfApplication } from '../rezonings/cities/Richmond/Applications'
import { checkIfPublicHearing } from '../rezonings/cities/Richmond/PublicHearings'
import { checkIfBylaw } from '../rezonings/cities/Richmond/Bylaws'

const sampleScrapedRezoningApplication = {
  "city": "Richmond",
  "metroCity": "Metro Vancouver",
  "url": "http://citycouncil.richmond.ca/decisions/search/permalink/14380/",
  "date": "2021-12-06",
  "meetingType": "Council Minutes",
  "title": "APPLICATION BY POLYGON TALISMAN PARK LTD. TO CREATE THE “RESIDENTIAL / LIMITED COMMERCIAL (ZMU47) – CAPSTAN VILLAGE (CITY CENTRE)” ZONE, AND TO REZONE THE SITE AT 8671, 8731, 8771, 8831/8851 CAMBIE ROAD, 8791 CAMBIE ROAD/3600 SEXSMITH ROAD, AND 3480, 3500, 3520, 3540/3560 SEXSMITH ROAD FROM THE “SINGLE DETACHED (RS1/F)” ZONE TO THE “RESIDENTIAL / LIMITED COMMERCIAL (ZMU47) – CAPSTAN VILLAGE (CITY CENTRE)” ZONE",
  "resolutionId": "R21/21-12R21/21-13",
  "contents": "Test contents",
  "minutesUrl": "https://citycouncil.richmond.ca/agendas/archives/council/2021/120621_minutes.htm",
  "reportUrls": [
    {
      "title": "Report",
      "url": "https://citycouncil.richmond.ca/agendafiles/Revised_Open_Council_12-6-2021.pdf"
    }
  ]
}

test('Richmond rezoning application checkIfApplication', () => {
  expect(checkIfApplication(sampleScrapedRezoningApplication)).toBe(true)
})

const sampleScrapedPublicHearing = {
  "city": "Richmond",
  "metroCity": "Metro Vancouver",
  "url": "http://citycouncil.richmond.ca/decisions/search/permalink/14491/",
  "date": "2022-02-22",
  "meetingType": "Public Hearing Minutes",
  "title": "RICHMOND ZONING BYLAW 8500, AMENDMENT BYLAW 10303 (RZ 21-930446)\n(Location:  11320 Williams Road; Applicant:  Habib Samari)",
  "resolutionId": "PH22/2-1",
  "contents": "Resolution: It was moved and seconded\n\nThat Richmond Zoning Bylaw 8500, Amendment Bylaw 10303 be given second and third readings.See minutes for detail.",
  "minutesUrl": "https://citycouncil.richmond.ca/agendas/archives/hearings/2022/022222_minutes.htm",
  "reportUrls": [
    {
      "title": "Report",
      "url": "https://citycouncil.richmond.ca/__shared/assets/1_Application_11230_WilliamsRd_PH_02222261140.pdf"
    }
  ]
}

test('Richmond public hearing checkIfPublicHearing', () => {
  expect(checkIfPublicHearing(sampleScrapedPublicHearing)).toBe(true)
})

const sampleScrapedBylaw = {
  "city": "Richmond",
  "metroCity": "Metro Vancouver",
  "url": "http://citycouncil.richmond.ca/decisions/search/permalink/14279/",
  "date": "2021-10-12",
  "meetingType": "Council Minutes",
  "title": "BYLAWS FOR ADOPTION - BYLAWS 9686 AND 9856",
  "resolutionId": "R21/17-12",
  "contents": "R21/17-12Outcome: It was moved and seconded\n\nThat the following bylaws be adopted:\n\nRichmond Zoning Bylaw No. 8500, Amendment Bylaw No. 9686\n\nRichmond Zoning Bylaw No. 8500, Amendment Bylaw No. 9856.",
  "minutesUrl": "https://citycouncil.richmond.ca/agendas/archives/council/2021/101221_minutes.htm",
  "reportUrls": [
    {
      "title": "Report",
      "url": "https://citycouncil.richmond.ca/__shared/assets/Bylaw9686_CNCL_10122159371.pdf"
    },
    {
      "title": "Report",
      "url": "https://citycouncil.richmond.ca/__shared/assets/Bylaw9856_CNCL_10122159372.pdf"
    }
  ]
}

test('Richmond bylaw checkIfBylaw', () => {
  expect(checkIfBylaw(sampleScrapedBylaw)).toBe(true)
})
