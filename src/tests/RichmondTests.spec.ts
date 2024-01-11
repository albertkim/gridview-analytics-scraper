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
  "contents": "R21/21-12R21/21-13Outcome: [R21/21-12] It was moved and seconded\n\n(1) That Official Community Plan Amendment Bylaw 10235, to amend Schedule 2.10 of Official Community Plan Bylaw 7100 (City Centre Area Plan), to amend:\n (a) Specific Land Use Map: Capstan Village – Detailed Transect Descriptions, Maximum Average net Development Site Density for General Urban (T4) and Urban Centre (T5), Additional density, where applicable: the addition of a new bullet:\n  (i) For 8671, 8731, 8771, 8831/8851 Cambie Road,\n8791 Cambie Road/3600 Sexsmith Road, and 3480, 3500, 3520, 3540/3560 Sexsmith Road: 0.02, subject to the provision of secured public open space above and beyond City Centre Area Plan (CCAP) requirements;\n\nbe introduced and given first reading;\n\n(2) That Bylaw 10235, having been considered in conjunction with:\n (a) the City’s Financial Plan and Capital Program; and\n (b) the Greater Vancouver Regional District Solid Waste and Liquid Waste Management Plans;\n\nis hereby found to be consistent with said program and plans, in accordance with Section 477(3)(a) of the Local Government Act;\n\n(3) That Bylaw 10235, having been considered in accordance with OCP Bylaw Preparation Consultation Policy 5043, is hereby found not to require further consultation; and\n\n(4) That Richmond Zoning Bylaw 8500, Amendment Bylaw 10198, as amended, to create the “Residential / Limited Commercial (ZMU47) – Capstan Village (City Centre)” zone, and to rezone 8671, 8731, 8771, 8831/8851 Cambie Road, 8791 Cambie Road/3600 Sexsmith Road, and 3480, 3500, 3520, 3540/3560 Sexsmith Road from the “Single Detached (RS1/F)” zone to the “Residential / Limited Commercial (ZMU47) – Capstan Village (City Centre)” zone and the “School and Institutional Use (SI)” zone, be given second reading, and forwarded to a new Public Hearing.\n\nThe question on the motion was not called as staff reviewed the application and provided the following application highlights:\n - the proposed development will include 1014 strata condominium units, 156 affordable housing units, and 171 market rental units;\n - the proposed development will include 1.35 acres of park and 0.75 acre of public open space;\n - site servicing and road improvements in area will be included in the proposed development;\n - off-site barn owl habitat will be developed;\n - soil will be recovered on-site and transferred to the Garden City Lands for farm use;\n - a district energy plant will be developed and transferred to the Lulu Island Energy Company upon completion of the project;\n - the proposed development is providing funding towards the Capstan Canada Line Station; and\n - The proposed development is providing contributions towards City planning, City facilities, child care and public art.\n\nDiscussion ensued with regard to (i) increasing the portion of the proposed development dedicated to market rental units to 25% of total units, (ii) accommodating the projected increase in the City’s population, (iii) increasing the City’s total stock of family-friendly affordable housing and market rental housing, and (iv) updating City policies to increase development requirements for affordable housing and market rental housing.\n\nAs a result of the discussion, the following referral motion was introduced:\n\n[R21/21-13] It was moved and seconded\n\nThat the staff report titled “Application by Polygon Talisman Park Ltd. to Create the “Residential / Limited Commercial (ZMU47) – Capstan Village (City Centre)” Zone, and to Rezone the Site at 8671, 8731, 8771, 8831/8851 Cambie Road, 8791 Cambie Road/3600 Sexsmith Road, and 3480, 3500, 3520, 3540/3560 Sexsmith Road from the “Single Detached (RS1/F)” Zone to the “Residential / Limited Commercial (ZMU47) – Capstan Village (City Centre)” Zone”, from the Director, Development, dated November 15, 2021, be referred back to staff to consider increasing the percentage of market rental housing floor area to 25%, and report back.\n\nDEFEATED\nOpposed: Mayor Brodie and\nCllrs. Hobbs\nLoo\nMcNulty\nMcPhail\nSteves\n\nThe question on the main motion was then called, and it was CARRIED with Cllrs. Au, Day and Wolfe opposed.",
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
