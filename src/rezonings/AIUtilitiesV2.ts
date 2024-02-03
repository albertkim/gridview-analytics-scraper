import chalk from 'chalk'
import { chatGPTTextQuery } from './AIUtilities'
import { ZoningStatus, ZoningType } from '../repositories/RecordsRepository'

// This will use GPT 3.5 (not 4 due to cost concerns) to summarize a rezoning/development permit document to the best of its ability
// You can use this function to extract permit IDs, just include them in the expected words array - too complicated to rely on regex from original document
export async function AISummarizeDocument(contents: string, expectedWords: string[], applicationIDFormat: string | null): Promise<string[]> {

  const fullQuery = `
    You are an expert in land use planning and development. Summarize the following document in a way that carefully retains all specific details as they relate to a rezoning or development permit. Make sure to include anything that looks like ${applicationIDFormat ? `${applicationIDFormat}` : 'an alphanumeric application/permit code/id/number (preserve numbers, letters, and dashes)'}, dates, address, applicant, applicant behalfs, building construction, building description, number and type of units, zoning codes, zoning descriptions, fsr, dollar values, and any other relevant details if exists. Exclude info referencing other meetings and documents.Include info about any final non-conditional decisions made. The document may include more than one rezoning/development permit. Accuracy is paramount as this summary will be used for further analysis.
    
    Return as a json object that looks like this, and make sure to double-check the format:
    {
      data: string[] (array of summaries - combine each into a single summary string please)
    }

    You are expected to include ${expectedWords.map((w) => `"${w}"`).join(', ')} in the summary.

    Here is the document: ${contents}
  `

  let response = await chatGPTTextQuery(fullQuery, '3.5')

  if (!response || response.error || !response.data) {
    console.log(chalk.red(`Error with document`))
    return []
  }

  // Try up to 3 times to get all the expected words
  let count = 1

  while (count < 3 && !expectedWords.every((word) => response.data.includes(word))) {

    console.log(chalk.yellow(`Missing expected words in response, retrying. Expected: ${expectedWords.join(', ')}`))
    console.log(response.data)
    response = await chatGPTTextQuery(fullQuery, '3.5')
    count++

  }

  return response.data

}

interface BaseRezoningQueryParams {
	introduction?: string // Custom instructions - ex. only include development permits that relate to new developments
  applicationId?: string // Expected format of the application ID (if any)
	status?: string
  fieldsToAnalyze: ('building type' | 'zoning' | 'stats' | 'status')[]
  expectedWords?: string[] // Strings that must be included in the AI response exactly as they are
}

interface IBuildingStats {
  buildings: number | null
  stratas: number | null
  rentals: number | null
  hotels: number | null
  fsr: number | null
  storeys: number | null
}

interface IZoningDetail {
  previousZoningCode: string | null
  previousZoningDescription: string | null
  newZoningCode: string | null
  newZoningDescription: string | null
}

// Note: It is recommended (but not necessary) to replace the application ID with a regex-parsed one from the caller
export async function AIGetPartialRecords(contents: string, applicationIDFormat: string | null, options: BaseRezoningQueryParams) {

  const summary = await AISummarizeDocument(contents, options.expectedWords || [], applicationIDFormat)

  const partialRezoningDetails: {
    applicationId: string | null
    address: string
    applicant: string | null
    behalf: string | null
    description: string
    buildingType: ZoningType | null
    zoning: IZoningDetail
    stats: IBuildingStats
    status: ZoningStatus | null
  }[] = []

  for (const summaryItem of summary) {

    const baseQuery = `
      You are an expert in land use planning and development. Carefully read the provided document and give me the following in a JSON format, give an empty array if no values to return - otherwise return a {error: message, reason: detailed explanation}.
      ${options?.introduction ? options.introduction : ''}
      {
        applicationId: ${options?.applicationId ? options.applicationId : 'the unique alphanumeric identifier for this rezoning, always a string, null if not specified'} 
        address: address in question - only street address, no city - if multiple addresses, comma separate, null if doesn't exist
        applicant: who the rezoning applicant is
        behalf: if the applicant is applying on behalf of someone else, who is it - null if doesn't exist
        description: a description of the rezoning and what the applicant wants to build - be specific, include numerical metrics
      }
      Document here: ${summaryItem}
    `

    let baseResponse = await chatGPTTextQuery(baseQuery, '3.5')
  
    if (!baseResponse || baseResponse.error) {
      continue
    }

    if (!baseResponse.address) {
      console.log(chalk.yellow(`Missing address in response, retrying`))
      console.log(baseResponse)
      baseResponse = await chatGPTTextQuery(baseQuery, '3.5')
      if (!baseResponse || baseResponse.error) {
        console.log(chalk.red(`Error in response: ${baseResponse}, skipping`))
        continue
      }
      if (!baseResponse.address) {
        console.log(chalk.red(`Missing address in response: ${baseResponse}, skipping`))
        continue
      }
    }

    // Check and fix application ID correctness (null, "null", undefined values)
		if (baseResponse.applicationId === 'null') {
			baseResponse.applicationId = null
		} else if (baseResponse.applicationId === undefined) {
			baseResponse.applicationId = null
		} else if (baseResponse.applicationId) {
			baseResponse.applicationId = `${baseResponse.applicationId}`
		}

    const baseObject = {
      applicationId: baseResponse.applicationId as string | null,
      address: baseResponse.address as string,
      applicant: baseResponse.applicant as string | null,
      behalf: baseResponse.behalf as string | null,
      description: baseResponse.description as string
    }

    const detailsResponse = await AIGetRecordDetails(summaryItem, {
      status: options.status,
      fieldsToAnalyze: options.fieldsToAnalyze
    })

    if (!detailsResponse) {
      continue
    }

    const detailsObject = {
      buildingType: detailsResponse.buildingType || null as ZoningType | null,
      zoning: detailsResponse.zoning || {
        previousZoningCode: null as string | null,
        previousZoningDescription: null as string | null,
        newZoningCode: null as string | null,
        newZoningDescription: null as string | null
      },
      stats: detailsResponse.stats || {
        buildings: null as number | null,
        stratas: null as number | null,
        rentals: null as number | null,
        hotels: null as number | null,
        fsr: null as number | null,
        storeys: null as number | null
      },
      status: detailsResponse.status || null as ZoningStatus | null,
    }

    partialRezoningDetails.push({
      ...baseObject,
      ...detailsObject
    })

  }

  return partialRezoningDetails

}

interface IDetailsParams {
	status?: string
  fieldsToAnalyze: ('building type' | 'zoning' | 'stats' | 'status')[]
}

interface IDetailsResponse {
  buildingType: ZoningType | null
  zoning: IZoningDetail
  stats: IBuildingStats
  status: ZoningStatus | null
}

export async function AIGetRecordDetails(contents: string, options: IDetailsParams): Promise<IDetailsResponse | null> {

  const detailedQueryReference = {
    buildingType: 'buildingType: one of single-family residential (including duplexes), townhouse, mixed use (only if there is residential + commercial), multi-family residential (only if there is no commercial), industrial (manufacturing, utilities, etc.), commercial, or other',
    zoning: `zoning: {
      previousZoningCode: city zoning code before rezoning or null if unclear - keep short
      previousZoningDescription: best description of previous zoning code (ex. low density residential)
      newZoningCode: city zoning code after rezoning or null if unclear - keep short
      newZoningDescription: best description of new zoning code (ex. high density residential)
    }`,
    stats: `stats: {
      buildings: your best guess as to the number of new buildings being proposed or null if unclear
      stratas: your best guess as to the total number of non-rental residential units/houses/townhouses - default to assuming strata if not specified - if single family, use number of buildings - null if unclear
      rentals: total number of rental units - 0 if no rentals mentioned - null if unclear
      hotels: total number of hotel units (not buildings) - 0 if no hotels mentioned - null if unclear
      fsr: total floor space ratio or null if unclear
      storeys: total number of storeys - pick the tallest if multiple - null if unclear
    }`,
    status: options.status ? `status: ${options.status}` : `status: one of applied, public hearing, approved, denied, withdrawn`
  }

  // NOTE: I used to run the details query with GPT 4 but it's too expensive for large volumes of data, trying 3.5 for now
  const detailsResponse = await chatGPTTextQuery(`
    You are an expert in land use planning and development. Carefully read the following description and get the following information in JSON format.
    {
      ${options.fieldsToAnalyze.includes('building type') ? detailedQueryReference.buildingType : ''}
      ${options.fieldsToAnalyze.includes('zoning') ? detailedQueryReference.zoning : ''}
      ${options.fieldsToAnalyze.includes('stats') ? detailedQueryReference.stats : ''}
      ${options.fieldsToAnalyze.includes('status') ? detailedQueryReference.status : ''}
    }
    Description here: ${contents}
  `, '3.5')

  if (!detailsResponse || detailsResponse.error) {
    console.log(chalk.red(`Error with getting details response: ${detailsResponse.error}`))
    return null
  }

  const detailsObject = {
    buildingType: detailsResponse.buildingType || null,
    zoning: detailsResponse.zoning || {
      previousZoningCode: null,
      previousZoningDescription: null,
      newZoningCode: null,
      newZoningDescription: null
    },
    stats: detailsResponse.stats || {
      buildings: null,
      stratas: null,
      rentals: null,
      hotels: null,
      fsr: null,
      storeys: null
    },
    status: detailsResponse.status as ZoningStatus || null,
  }

  return detailsObject

}
