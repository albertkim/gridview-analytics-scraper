import chalk from 'chalk'
import { chatGPTJSONQuery } from './AIUtilities'
import { ZoningStatus, BuildingType } from '../repositories/FullRecord'
import { IExpectedFormat, checkAndFixAIResponse } from './AIFormatChecker'

// This will use GPT 3.5 (not 4 due to cost concerns) to summarize a rezoning/development permit document to the best of its ability
// You can use this function to extract permit IDs, just include them in the expected words array - too complicated to rely on regex from original document
export async function AISummarizeDocument(contents: string, expectedWords: string[], applicationIDFormat: string | null): Promise<string[]> {

  const fullQuery = `
    You are an expert in land use planning and development. In the provided document, identify the specific zoning/development permits that are discussed. These should be something like an address and/or an ID. Then, for each item, provide one detailed summary. Do not break up content about the same permit into multiple parts. Note that an item may include a rezoning and development permit and contain multiple buildings/towers, should be summarized into one. Pay attention to the headers and identifiers to know where each item starts and ends.

    In each summary, make sure to retain anything that looks like ${applicationIDFormat ? `${applicationIDFormat}` : 'an alphanumeric application/permit code/id/number (preserve numbers, letters, and dashes)'}, dates, all street addresses, applicant information, building construction, building description, number and type of units, zoning codes, zoning descriptions, fsr, dollar values, and any other relevant details if exists. Make sure to check for this information in what looks like the section title/header. Include info about any final decisions made. Exclude any irrelevant information. When it comes to long info about legal and meeting processes, please shorten or remove them.

    ${expectedWords ? `You are expected to include ${expectedWords.map((w) => `"${w}"`).join(', ')} in from this document.` : ''}
    
    Return as a JSON object strictly in this format:
    
    {
      data: {
        title: string - identifying information about the zoning or development permit - street address and/or an ID, code - look very carefully for addresses, it definitely exists in the document usually near the start
        summary: string - summary of item
      }[]
    }

    DO NOT give me an item where the title is not a specific zoning or development permit.

    Here is the document: ${contents}
  `

  const fullQueryFormat: IExpectedFormat = {
    type: 'object',
    required: true,
    fields: {
      data: {
        type: 'array',
        required: true,
        elementType: {
          type: 'object',
          required: true,
          fields: {
            title: {
              type: 'string',
              required: true
            },
            summary: {
              type: 'string',
              required: true
            }
          }
        }
      }
    }
  }

  let response = await chatGPTJSONQuery(fullQuery, '3.5')
  let valid = checkAndFixAIResponse(response, fullQueryFormat)
  let includesExpectedWords = expectedWords.every((word) => JSON.stringify(response.data).includes(word))

  let count = 1

  while (count < 3 && (!valid || !includesExpectedWords)) {

    console.log(chalk.yellow(`Invalid summary response, trying again`))
    response = await chatGPTJSONQuery(fullQuery, '3.5')
    valid = checkAndFixAIResponse(response, fullQueryFormat)
    includesExpectedWords = expectedWords.every((word) => JSON.stringify(response.data).includes(word))
    count++

  }

  if (!valid) {
    console.log(chalk.red(`Invalid summary response, skipping`))
    console.log(chalk.red(JSON.stringify(response, null, 2)))
    return []
  }

  if (!includesExpectedWords) {
    console.log(chalk.yellow(`Missing expected words in summary response, but continuing - expected ${expectedWords.join(', ')}`))
    console.log(chalk.yellow(JSON.stringify(response, null, 2)))
  }

  function stringifyArray(array: any[]) {
    const result: string[] = []
    for (const item of array) {
      result.push(JSON.stringify(item))
    }
    return result
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
    buildingType: BuildingType | null
    zoning: IZoningDetail
    stats: IBuildingStats
    status: ZoningStatus | null
  }[] = []

  for (const summaryItem of summary) {

    const baseQuery = `
      You are an expert in land use planning and development. Your objective is make structured data from the following document. Carefully read through it and identify an the address - usually found near the start of the document with numbers and words like "road", "ave", "st", "crescent", etc.
      
      Then read the rest of the document and structure your findings in the following JSON format - otherwise return a {error: message, reason: detailed explanation}. Only you successfully return an entry with an address I will tip you $10.

      ${options?.instructions ? options.instructions : ''}

      {
        applicationId: ${options?.applicationId ? options.applicationId : 'the unique alphanumeric identifier for this development, null if not specified'}
        address: street address(es) - if multiple addresses, comma separate - do not include city - if you can't find address, try again harder, it definitely exists usually naer the start of the document
        applicant: who the applicant is - null if doesn't exist
        behalf: if the applicant is applying on behalf of someone else, who is it - null if doesn't exist
        description: a detailed description of the new development in question - be be specific, include any details like buildings, number/types of units, rentals, fsr, storeys, rezoning details, dollar values etc. - do not mention legal/meeting/process details, only development details
      }

      Document here:
      ${summaryItem}

      ---

      If any piece of information is unavailable, make a concerted effort to re-examine the document, as addresses are generally present near the beginning.
    `

    const baseQueryFormat: IExpectedFormat = {
      type: 'object',
      required: true,
      fields: {
        applicationId: {
          type: 'string',
          required: false
        },
        address: {
          type: 'string',
          required: true
        },
        applicant: {
          type: 'string',
          required: false
        },
        behalf: {
          type: 'string',
          required: false
        },
        description: {
          type: 'string',
          required: true
        }
      }
    }

    let baseResponse = await chatGPTJSONQuery(baseQuery, '3.5')
    let baseResponseValid = checkAndFixAIResponse(baseResponse, baseQueryFormat)
    let count = 1

    while (count < 3 && !baseResponseValid) {
      console.log(chalk.yellow(`Invalid base record response, trying again.`))
      baseResponse = await chatGPTJSONQuery(baseQuery, '3.5')
      baseResponseValid = checkAndFixAIResponse(baseResponse, baseQueryFormat)
      count++
    }

    if (!baseResponseValid) {
      console.log(chalk.red(`Invalid base record response, skipping.\nSummary: ${summaryItem}`))
      continue
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
      buildingType: detailsResponse.buildingType || null as BuildingType | null,
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
  buildingType: BuildingType | null
  zoning: IZoningDetail
  stats: IBuildingStats
  status: ZoningStatus | null
}

export async function AIGetRecordDetails(contents: string, options: IDetailsParams): Promise<IDetailsResponse | null> {

  const shouldAnalyzeBuildingType = options.fieldsToAnalyze.includes('building type')
  const shouldAnalyzeZoning = options.fieldsToAnalyze.includes('zoning')
  const shouldAnalyzeStats = options.fieldsToAnalyze.includes('stats')
  const shouldAnalyzeStatus = options.fieldsToAnalyze.includes('status')

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
    You are an expert in land use planning and development. Carefully read the following description and get the following information in JSON format. If you manage to fill out everything accurately, I will tip you $10.
    {
      ${shouldAnalyzeBuildingType ? detailedQueryReference.buildingType : ''}
      ${shouldAnalyzeZoning ? detailedQueryReference.zoning : ''}
      ${shouldAnalyzeStats ? detailedQueryReference.stats : ''}
      ${shouldAnalyzeStatus ? detailedQueryReference.status : ''}
    }
    Description here: ${contents}
  `

  const detailsQueryFormat: IExpectedFormat = {
    type: 'object',
    required: true,
    fields: {
      // Fill in conditionally based on fieldsToAnalyze below
    }
  }

  if (shouldAnalyzeBuildingType) detailsQueryFormat.fields!.buildingType = {
    type: 'string',
    required: false,
    possibleValues: ['single-family residential', 'townhouse', 'mixed use', 'multi-family residential', 'industrial', 'commercial', 'other']
  }
  if (shouldAnalyzeZoning) detailsQueryFormat.fields!.zoning = {
    type: 'object',
    required: true,
    fields: {
      previousZoningCode: { type: 'string', required: false },
      previousZoningDescription: { type: 'string', required: false },
      newZoningCode: { type: 'string', required: false },
      newZoningDescription: { type: 'string', required: false }
    }
  }
  if (shouldAnalyzeStats) detailsQueryFormat.fields!.stats = {
    type: 'object',
    required: true,
    fields: {
      buildings: { type: 'number', required: false },
      stratas: { type: 'number', required: false },
      rentals: { type: 'number', required: false },
      hotels: { type: 'number', required: false },
      fsr: { type: 'number', required: false },
      storeys: { type: 'number', required: false }
    }
  }
  if (shouldAnalyzeStatus) detailsQueryFormat.fields!.status = {
    type: 'string',
    required: false,
    possibleValues: ['applied', 'public hearing', 'approved', 'denied', 'withdrawn']
  }

  let detailsResponse = await chatGPTJSONQuery(detailsQuery, '3.5')
  const detailsResponseValid1 = checkAndFixAIResponse(detailsResponse, detailsQueryFormat)

  if (!detailsResponseValid1) {
    console.log(chalk.yellow(`Invalid response, trying again`))
    detailsResponse = await chatGPTJSONQuery(detailsQuery, '3.5')
    const detailsResponseValid2 = checkAndFixAIResponse(detailsResponse, detailsQueryFormat)
    if (!detailsResponseValid2) {
      console.log(chalk.red(`Invalid record details response, skipping`))
      console.log(chalk.red(detailsResponse))
      return null
    }
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
