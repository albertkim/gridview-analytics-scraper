import chalk from 'chalk'
import { chatGPTJSONQuery } from './AIUtilities'
import { ZoningStatus, ZoningType } from '../repositories/RecordsRepository'

// This will use GPT 3.5 (not 4 due to cost concerns) to summarize a rezoning/development permit document to the best of its ability
// You can use this function to extract permit IDs, just include them in the expected words array - too complicated to rely on regex from original document
export async function AISummarizeDocument(contents: string, expectedWords: string[], applicationIDFormat: string | null): Promise<string[]> {

  const fullQuery = `
    You are an expert in land use planning and development. In the provided document, identify the specific zoning/development permits that are discussed. These should be something like an address and/or an ID. Then, for each item, provide one detailed summary. Do not break up content about the same permit into multiple parts. Note that an item may include a rezoning and development permit and contain multiple buildings/towers, should be summarized into one. Pay attention to the headers and identifiers to know where each item starts and ends.

    In each summary, make sure to retain anything that looks like ${applicationIDFormat ? `${applicationIDFormat}` : 'an alphanumeric application/permit code/id/number (preserve numbers, letters, and dashes)'}, dates, all complete street addresses, applicant information, building construction, building description, number and type of units, zoning codes, zoning descriptions, fsr, dollar values, and any other relevant details if exists. Make sure to check for this information in what looks like the section title/header. Include info about any final decisions made. Exclude any irrelevant information. When it comes to long info about legal and meeting processes, please shorten or remove them.

    ${expectedWords ? `You are expected to include ${expectedWords.map((w) => `"${w}"`).join(', ')} in from this document.` : ''}
    
    Return as a JSON object strictly in this format:
    
    {
      data: {
        title: string - identifying information about the zoning or development permit such street address and/or an ID, code
        summary: string - summary of item
      }[]
    }

    DO NOT give me an item where the title is not a specific zoning or development permit.

    Here is the document: ${contents}
  `

  let response = await chatGPTJSONQuery(fullQuery, '3.5')

  if (!response || response.error || !response.data) {
    console.log(chalk.red(`Error with document`))
    return []
  }

  // Just stringify the data.
  function stringifyArray(array: any[]) {
    const result: string[] = []
    for (const item of array) {
      result.push(JSON.stringify(item))
    }
    return result
  }

  // Try up to 3 times to get all the expected words anywhere in the array of strings
  let count = 1

  while (count < 3 && !expectedWords.every((word) => stringifyArray(response.data).join('\n').includes(word))) {

    console.log(chalk.yellow(`Missing expected words in response, retrying. Expected: ${expectedWords.join(', ')}`))
    console.log(response.data)
    response = await chatGPTJSONQuery(fullQuery, '3.5')
    count++

  }

  // Log an error but continue with this summary
  if (!expectedWords.every((word) => stringifyArray(response.data).join('\n').includes(word))) {
    console.log(chalk.red(`Still missing expected words in response, continuing. Expected: ${expectedWords.join(', ')}`))
    console.log(response.data)
  }

  return stringifyArray(response.data)

}

interface BaseRezoningQueryParams {
	instructions?: string // Custom instructions - ex. only include development permits that relate to new developments
  applicationId?: string // Expected format of the application ID (if any)
	status?: string
  fieldsToAnalyze: ('building type' | 'zoning' | 'stats' | 'status')[]
  expectedWords?: string[] // There are 2 steps: summarization, then rezoning parsing. These words are expected to be in the summarization stage, but may not exist in the final parse because the LLM might have filtered them out based on a query intro like "only include new building developments" etc.
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
export async function AIGetPartialRecords(contents: string, options: BaseRezoningQueryParams) {

  const summary = await AISummarizeDocument(contents, options.expectedWords || [], options.applicationId || null)

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
      You are an expert in land use planning and development. Carefully read the provided document and give me the following in a JSON format - otherwise return a {error: message, reason: detailed explanation}. Return only entries with an address.
      ${options?.instructions ? options.instructions : ''}
      {
        applicationId: ${options?.applicationId ? options.applicationId : 'the unique alphanumeric identifier for this rezoning, null if not specified'} 
        address: street address(es) - if multiple addresses, comma separate - do not include city = should not be null
        applicant: who the rezoning applicant is - null if doesn't exist
        behalf: if the applicant is applying on behalf of someone else, who is it - null if doesn't exist
        description: a description of the new development in question - be be specific, include any details like buildings, number/types of units, rentals, fsr, storeys, rezoning details, etc - do not mention legal/meeting/process details, only development details
      }
      Document here: ${summaryItem}
    `

    let baseResponse = await chatGPTJSONQuery(baseQuery, '3.5')

    // Can't check for expected words here because the query may have filtered out some words. Instead just make sure an address exists
    if (!baseResponse || !baseResponse.address) {
      baseResponse = await chatGPTJSONQuery(baseQuery, '3.5')
      if (!baseResponse) {
        // Probably doesn't meet a condition given in the custom instructions, don't need to log either
        continue
      }
      if (!baseResponse.address) {
        console.log(chalk.yellow(`No address found in response, Skipping.\nSummary: ${summaryItem}`))
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
    buildingType: 'buildingType: one of "single-family residential" (including duplexes), "townhouse", "mixed use" (only if there is residential + commercial), "multi-family residential" (only if there is no commercial), "industrial" (manufacturing, utilities, etc.), "commercial", or "other"',
    zoning: `zoning: {
      previousZoningCode: string | null - city zoning code before rezoning - null if unclear - keep short
      previousZoningDescription: string | null - best description of previous zoning code (ex. low density residential) - null if unclear
      newZoningCode: string | null - city zoning code after rezoning - null if unclear - keep short
      newZoningDescription: string | null - best description of new zoning code (ex. high density residential) - null if unclear
    }`,
    stats: `stats: {
      buildings: number | null - your best guess as to the number of new buildings being proposed - null if unclear
      stratas: number | null - your best guess as to the total number of non-rental residential units/houses/townhouses - 0 if no residential units mentioned - if single family, use number of buildings - null if unclear
      rentals: number | null - total number of rental units - 0 if no rentals mentioned
      hotels: number | null - total number of hotel units (not buildings) - 0 if no hotels mentioned
      fsr: number | null - total floor space ratio - null if unclear
      storeys: number | null - total number of storeys - pick the tallest if multiple - null if unclear
    }`,
    status: options.status ? `status: ${options.status}` : `status: one of "applied", "public hearing", "approved", "denied", "withdrawn"`
  }

  const detailsQuery = `
    You are an expert in land use planning and development. Carefully read the following description and get the following information in JSON format.
    {
      ${options.fieldsToAnalyze.includes('building type') ? detailedQueryReference.buildingType : ''}
      ${options.fieldsToAnalyze.includes('zoning') ? detailedQueryReference.zoning : ''}
      ${options.fieldsToAnalyze.includes('stats') ? detailedQueryReference.stats : ''}
      ${options.fieldsToAnalyze.includes('status') ? detailedQueryReference.status : ''}
    }
    Description here: ${contents}
  `

  let detailsResponse = await chatGPTJSONQuery(detailsQuery, '3.5')

  // IMPORTANT: Make sure to update these arrays if more building type or status options are added
  const validBuildingTypes = ['single-family residential', 'townhouse', 'mixed use', 'multi-family residential', 'industrial', 'commercial', 'other']
  const validStatuses = ['applied', 'public hearing', 'approved', 'denied', 'withdrawn']

  if (detailsResponse.buildingType && !validBuildingTypes.includes(detailsResponse.buildingType)) {
    console.log(chalk.yellow(`Invalid building type: ${detailsResponse.buildingType} - trying again`))
    detailsResponse = await chatGPTJSONQuery(detailsQuery, '3.5')
    if (!detailsResponse || !validBuildingTypes.includes(detailsResponse.buildingType)) {
      console.log(chalk.red(`Invalid building type: ${detailsResponse?.buildingType} - but continuing`))
    }
  }

  if (detailsResponse.status && !validStatuses.includes(detailsResponse.status)) {
    console.log(chalk.yellow(`Invalid status: ${detailsResponse.status} - trying again`))
    detailsResponse = await chatGPTJSONQuery(detailsQuery, '3.5')
    if (!detailsResponse || !validStatuses.includes(detailsResponse.status)) {
      console.log(chalk.red(`Invalid status: ${detailsResponse?.status} - but continuing`))
    }
  }

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
