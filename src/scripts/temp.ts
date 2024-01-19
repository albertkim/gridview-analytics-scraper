import { RezoningsRepository } from '../repositories/RezoningsRepository'


(async () => {

  const test = await RezoningsRepository.getRezoningsWithSimilarAddresses({
    "id": "rez-7ia52z2n42btly85a8jfs",
    "rezoningId": "REZ #19-52",
    "address": "3700 Gilmore Way",
    "applicant": "Canadian Turner Construction Company",
    "behalf": null,
    "description": "To seek authorization for the construction of two three to five storey office buildings with underground parking for the expansion of the Electronic Arts (EA) Burnaby campus.",
    "type": "commercial",
    "status": "public hearing",
    "dates": {
      "appliedDate": "2020-07-27",
      "publicHearingDate": "2023-12-12",
      "approvalDate": "2022-05-30",
      "denialDate": null,
      "withdrawnDate": null
    },
    "stats": {
      "buildings": 2,
      "stratas": 0,
      "rentals": 0,
      "hotels": 0,
      "fsr": null,
      "storeys": null
    },
    "zoning": {
      "previousZoningCode": "CD",
      "previousZoningDescription": "Comprehensive Development District",
      "newZoningCode": "Amended CD",
      "newZoningDescription": "Comprehensive Development District based on the M5 Light Industrial District and M8 Advanced Technology Research District, the Discovery Place Community Plan as guidelines, and in accordance with the development plan entitled '3700 Gilmore At Sanderson Way, Burnaby, BC' prepared by Turner/Dialog"
    },
    "city": "Burnaby",
    "metroCity": "Metro Vancouver",
    "urls": [
      {
        "date": "2023-12-12",
        "title": "REZ 23-02 3700 Gilmore Way PH Report - 2023-10-30.pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=73287",
        "type": "public hearing"
      },
      {
        "date": "2023-12-12",
        "title": "Attachment 1 - REZ 23-02 - Sketch 1 and 2.pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=73288",
        "type": "public hearing"
      },
      {
        "date": "2023-12-12",
        "title": "14611 No. 33 (ACD).pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=73289",
        "type": "public hearing"
      },
      {
        "date": "2023-12-12",
        "title": "Revised REZ 20-17 Ptn 6229 Marine Drive PH Report (2023-11-20).pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=73290",
        "type": "public hearing"
      },
      {
        "date": "2023-12-12",
        "title": "REZ 20-17 Ptn 6229 Marine Drive PH Report - Attachment 1 - Sketch 1 and 2 (2023-11-20).pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=73291",
        "type": "public hearing"
      },
      {
        "date": "2023-12-12",
        "title": "REZ 20-17 Ptn 6229 Marine Drive PH Report - Attachment 2 - Appendix A (2023-11-20).pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=73292",
        "type": "public hearing"
      },
      {
        "date": "2023-12-12",
        "title": "Bylaw 14613 No. 35 (ACD) rev.pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=73293",
        "type": "public hearing"
      },
      {
        "date": "2023-12-12",
        "title": "FYI - REZ 20-17 Ptn 6229 Marine Drive PH Report - 2023-10-30.pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=73294",
        "type": "public hearing"
      },
      {
        "date": "2023-12-12",
        "title": "FYI - Bylaw 14613 No. 35 (ACD).pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=73295",
        "type": "public hearing"
      },
      {
        "date": "2023-12-12",
        "title": "Rez 20-17 PH Corresp Tracking No. 2 - 3_Redacted.pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=73296",
        "type": "public hearing"
      },
      {
        "date": "2023-12-12",
        "title": "Rez 20-17 PH Corresp Tracking No. 4 Parts 1 and 2_Redacted.pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=73297",
        "type": "public hearing"
      },
      {
        "date": "2023-12-12",
        "title": "Rez 20-17 PH Corresp Tracking No. 5_Redacted.pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=73298",
        "type": "public hearing"
      },
      {
        "date": "2023-12-12",
        "title": "Rez 20-17 PH Corresp Tracking No. 6_Redacted.pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=73299",
        "type": "public hearing"
      },
      {
        "date": "2023-10-30",
        "title": "REZ 23-02 3700 Gilmore Way PH Report - 2023-10-30.pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=71278",
        "type": "applied"
      },
      {
        "date": "2023-10-30",
        "title": "Attachment 1 - REZ 23-02 - Sketch 1 and 2.pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=71279",
        "type": "applied"
      },
      {
        "date": "2022-05-30",
        "title": "14203 No. 30, 2020 acd.pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=60432",
        "type": "approved"
      },
      {
        "date": "2022-05-30",
        "title": "Rezoning Reference 19-52 Final Adoption 2022.05.30.pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=60433",
        "type": "approved"
      },
      {
        "date": "2020-08-25",
        "title": "Rezoning Reference 19-52 PH Report 2020.07.27.pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=48299",
        "type": "public hearing"
      },
      {
        "date": "2020-08-25",
        "title": "REZ 19-52 SPOD.pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=48300",
        "type": "public hearing"
      },
      {
        "date": "2020-08-25",
        "title": "14203 No. 30, 2020 acd.pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=48301",
        "type": "public hearing"
      },
      {
        "date": "2020-08-25",
        "title": "EASports.pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=48302",
        "type": "public hearing"
      },
      {
        "date": "2020-07-27",
        "title": "Rezoning Reference 19-52 PH Report 2020.07.27.pdf",
        "url": "https://pub-burnaby.escribemeetings.com/filestream.ashx?DocumentId=47800",
        "type": "applied"
      }
    ],
    "minutesUrls": [
      {
        "date": "2023-12-12",
        "url": "https://pub-burnaby.escribemeetings.com/Meeting.aspx?Id=6ed401d8-4b6c-4215-9bdf-5bddd35ebd7f&lang=English",
        "type": "public hearing"
      },
      {
        "date": "2023-10-30",
        "url": "https://pub-burnaby.escribemeetings.com/Meeting.aspx?Id=627a3577-485d-48b0-8770-dc8f0199ea42&lang=English",
        "type": "applied"
      },
      {
        "date": "2022-05-30",
        "url": "https://pub-burnaby.escribemeetings.com/Meeting.aspx?Id=7b6a8ba2-f602-4a7b-a700-36f7f6ec991c&lang=English",
        "type": "approved"
      },
      {
        "date": "2020-08-25",
        "url": "https://pub-burnaby.escribemeetings.com/Meeting.aspx?Id=621f43e3-c03f-4a30-8d6b-31e13c0f6f3b&lang=English",
        "type": "public hearing"
      },
      {
        "date": "2020-07-27",
        "url": "https://pub-burnaby.escribemeetings.com/Meeting.aspx?Id=ff36f2e0-8986-42bd-b2c4-549e91b32c14&lang=English",
        "type": "applied"
      }
    ],
    "location": {
      "latitude": 49.24943,
      "longitude": -123.0086995
    },
    "createDate": "2024-01-17",
    "updateDate": "2024-01-18"
  })

  console.log(test)

})()
