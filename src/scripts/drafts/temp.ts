import moment from 'moment'
import { IMeetingDetail, RawRepository } from '../../repositories/RawRepository'
import { RezoningsRepository, checkGPTRezoningJSON } from '../../repositories/RezoningsRepository'
import { checkIfApplication } from '../../rezonings/cities/Surrey/Applications'
import { checkIfBylaw } from '../../rezonings/cities/Surrey/Bylaws'
import { checkIfPublicHearing, parsePublicHearing } from '../../rezonings/cities/Surrey/PublicHearings'
import { downloadPDF, parsePDF } from '../../rezonings/PDFUtilities'
import { chatGPTTextQuery } from '../../rezonings/AIUtilities'

(async () => {

  const url = 'https://www.burnaby.ca/sites/default/files/acquiadam/2023-04/April-27-2023.pdf'

  const pdf = await downloadPDF(url)
  const parsed = await parsePDF(pdf)

  const response = await chatGPTTextQuery(`
    Given the following text extracted from a PDF that represents development permit data, identify only permits that relate to the construction of new buildings, then give me the data in the following JSON data structure:
    {
      data: {
        permitNumber: usually in the format of BLDXX-XXXXX
        address: address in question, only include street address, not city or postal code
        buildingType: one of single-family residential (including duplexes), townhouse, mixed use (only if there is residential + commercial), multi-family residential (only if there is no commercial), industrial (manufacturing, utilities, etc.), commercial, or other (if demo or not a permit for a new building) - all lowercase
        value: $ value as a number
        numberOfUnits: number of units, usually a number listed right after the $ value
        applicant: name of applicant
        description: complete description of project
      }[]
    }

    Here is the text: ${parsed}
  `, '4')

  console.log(response)

})()
