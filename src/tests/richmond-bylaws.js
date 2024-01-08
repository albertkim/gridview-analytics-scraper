const chalk = require('chalk')
const { chatGPTTextQuery } = require('../utilities')

const news = {
  "city": "Richmond",
  "metroCity": "Metro Vancouver",
  "url": "http://citycouncil.richmond.ca/decisions/search/permalink/15482/",
  "date": "November 14, 2023",
  "meetingType": "City council",
  "title": "BYLAWS FOR ADOPTION - BYLAWS 10486 AND 10490",
  "resolutionId": "R23/19-17",
  "contents": "R23/19-17Outcome: It was moved and seconded\n\nThat the following bylaws be adopted:\n\nConsolidated Fees Bylaw No. 8636, Amendment Bylaw No. 10486; and\n\nHousing Agreement (10140, 10160 and 10180 No 1 Road and 4051 and 4068 Cavendish Drive) Bylaw No. 10490.",
  "minutesUrl": "https://citycouncil.richmond.ca/agendas/council/111423_minutes.htm",
  "reportUrls": [
    {
      "title": "Report",
      "url": "https://citycouncil.richmond.ca/__shared/assets/Bylaw_1048670736.pdf"
    },
    {
      "title": "Report",
      "url": "https://citycouncil.richmond.ca/__shared/assets/Bylaw-1049070737.pdf"
    }
  ]
}

async function main() {
  // All required information is in the description text
  const GPTTextReply = await chatGPTTextQuery(`
    Given the following description of city bylaw adoptions, find only the ones that relate to Richmond Zoning Bylaws and return the following in JSON format:
    {
      items: [
        {
          address: address - usually in the brackets,
          rezoningId: in the format of RZ 12-123456 - usually in the brackets - null if not found,
          status: one of approved or denied
        }
      ]
    }
    Description: ${news.contents}
  `)
  const replyData = JSON.parse(GPTTextReply.choices[0].message.content)

  console.log(replyData)

  // Validate the GPT JSON
  if (Array.isArray(replyData.items)) {
    let valid = true
    replyData.items.forEach((item) => {
      if (!('address' in item) || !('rezoningId' in item) || !('status' in item)) {
        valid = false
      }
    })
    if (!valid) {
      console.error(chalk.bgRed('GPT JSON is invalid, skipping'))
    }
  }
}

main()
