import { RezoningsRepository, checkGPTRezoningJSON } from '../../repositories/RezoningsRepository'
import { parsePublicHearing } from '../../rezonings/cities/Surrey/PublicHearings'

(async () => {

  const object = {
    "city": "Surrey",
    "metroCity": "Metro Vancouver",
    "url": "https://www.surrey.ca/sites/default/files/minutes/MIN_RCPH_2023_12_18.pdf",
    "date": "2023-12-18",
    "meetingType": "Regular Council Public Hearing",
    "minutesUrl": "https://www.surrey.ca/sites/default/files/minutes/MIN_RCPH_2023_12_18.pdf",
    "resolutionId": null,
    "title": "B. DELEGATIONS - PUBLIC HEARING: 2. \"Surrey Official Community Plan Bylaw, 2013, No. 18020, Text Amendment",
    "contents": "2. \"Surrey Official Community Plan Bylaw, 2013, No. 18020, Text Amendment\nBylaw, 2023, No. 21110\"\n\"Surrey Comprehensive Development Zone 170 (CD 170), Bylaw, 2023, No. 21111\"\nApplication No. 7923-0001-00\n\nCIVIC ADDRESS: 14275 and 14297 – 103A Avenue; 10365 – 143 Street\n\nAPPLICANT: Owner: 1336514 B.C. Ltd.\n(Director Information: D. Nijjar, H. Nijjar, G. Nijjer)\nAgent: G. Nijjer\n\nPURPOSE: The applicant is requesting to amend Official Community\nPlan (OCP) Table 7A: Land Use Designation Exceptions by\npermitting a floor area ratio up to 2.5 FAR for the subject site.\nThe proposal also includes rezoning the same site from Single\nFamily Residential Zone to Comprehensive Development\nZone in order to develop a 6-storey apartment building with\napproximately 66 dwelling units and underground parking on\na consolidated site in Guildford.\n\nThe Notice of the Public Hearing was read by the City Clerk.\n\nR. Landale, Fleetwood: The delegation expressed opposition to the proposal citing\nlocation, density, traffic, and schools.\n\nD. Jack, Surrey Environmental Partners: The delegation spoke to trees, amenity\nspace and a green roof.\n\nWritten submissions were received as follows:\n\n• R. Landale expressing opposition for the proposal citing location and schools.\n\n\n\nRegular Council - Public Hearing Minutes December 18, 2023\n\n\nPage 5",
    "reportUrls": [
      {
        "date": "2023-12-04",
        "title": "Planning Report 7923-0001-00",
        "contents": "14275 – 103A Avenue\n14297 – 103A Avenue\n10365 – 143 Street",
        "url": "https://www.surrey.ca/sites/default/files/planning-reports/PLR_7923-0001-00.pdf",
        "tag": ""
      }
    ]
  }

  const response = await parsePublicHearing(object)

  console.log(response)

})()
