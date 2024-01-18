import dotenv from 'dotenv'
import OpenAI from 'openai'
import chalk from 'chalk'
import { ImageAnnotatorClient } from '@google-cloud/vision'
import { IPartialRezoningDetail, checkGPTRezoningJSON } from '../repositories/RezoningsRepository'

dotenv.config()

const chatGPTAPIKey = process.env.CHAT_GPT_API_KEY!

const openai = new OpenAI({
	apiKey: chatGPTAPIKey
})

// Uses the GOOGLE_APPLICATION_CREDENTIALS environment variable
const googleVisionClient = new ImageAnnotatorClient()

interface BaseRezoningQueryParams {
  rezoningId?: string
}

// Send a text query to ChatGPT 3.5 turbo and get data back in JSON format
// Make sure that the query includes the word 'JSON'
// Defaults to 3.5, specify 4 if you want to use 4
export async function chatGPTTextQuery(query: string, gptVersion?: '3.5' | '4'): Promise<any | null> {
	console.log(`Sending text query to ChatGPT ${gptVersion || '3.5'}`)

	const gptVersionMapping = {
		'3.5': 'gpt-3.5-turbo-1106',
		'4': 'gpt-4-1106-preview'
	}

	try {

		const response = await openai.chat.completions.create({
			model: gptVersionMapping[gptVersion || '3.5'],
			messages:[
				{
					'role': 'user',
					'content': query
				}
			],
			response_format: {
				type: 'json_object'
			},
			temperature: 0.2
		})

		if (!response) {
			return null
		}

		const content = JSON.parse(response.choices[0].message.content!)

		if (content.error) {
			return null
		}
		return content
	} catch (error: any) {
		if (error.response && error.response.data) {
			console.error(error.response.data)
			throw new Error()
		} else {
			console.error(error)
			throw new Error()
		}
	}
}

// This function returns a partial rezoning detail object and retries if the first time doesn't work
// Caller is expected to handle thrown errors - best practice is to add to the ErrorsRepository
export async function chatGPTPartialRezoningQuery(query: string, options: {analyzeType: boolean, analyzeStats: boolean}): Promise<IPartialRezoningDetail | null> {
	try {

		const content = await chatGPTTextQuery(query)

		if (content && content.rezoningId === 'null') {
			content.rezoningId = null
		} else if (content && content.rezoningId) {
			content.rezoningId = `${content.rezoningId}` // Sometimes rezoning IDs come back as a number, breaks string-based code later
		}

		if (!content.address) {
			return null
		}

		// Re-try once if invalid JSON
		if (!checkGPTRezoningJSON(content)) {

			console.warn(chalk.yellow('Partial rezoning details GPT JSON is invalid, running again'))

			const content = await chatGPTTextQuery(`Carefully double-check the json format I'm requesting. ${query}`)

			if (!content) {
				return null
			}

			if (!checkGPTRezoningJSON(content)) {
        console.error(chalk.red('Partial rezoning details GPT JSON is invalid 2nd time, returning null'))
        console.error(chalk.red(JSON.stringify(content, null, 2)))
				return null
			}

		}

		if (content.error) {
			console.error(chalk.red('GPT response error'))
			console.error(content.error)
			return null
		}

		console.log(chalk.green('GPT partial rezoning JSON is valid'))

		if (options && options.analyzeType) {
			const typeContent = await chatGPTTextQuery(getGPTBaseRezoningTypeQuery(content.description))
			if (typeContent && typeContent.type) {
				content.type = typeContent.type
			} else {
				console.error(chalk.red('Failed to get rezoning type'))
			}
		}

		if (options && options.analyzeStats) {
			const statsContent = await chatGPTTextQuery(getGPTBaseRezoningStatsQuery(content.description), '4')
			if (statsContent) {
				content.stats = statsContent
			} else {
				console.error(chalk.red('Failed to get rezoning stats'))
			}
		}

		return content

	} catch (error: any) {

		if (error.response && error.response.data) {
			console.error(error.response.data)
			throw error
		} else {
			console.error(error)
			throw error
		}

	}
}

// Use Google Cloud Vision OCR to extract text from an image
// Process the text data, then use ChatGPT 3.5 Turbo to get data back in JSON format
export async function imageQuery(query: string, fileData: string, gptVersion?: '3.5' | '4') {

	try {

		console.log(`Sending data query to Google Cloud Vision`)

		const [result] = await googleVisionClient.textDetection({
			image: {
				content: fileData
			}
		})

		console.log(`Google Cloud Vision data returned`)

		const detections = result.textAnnotations
		if (!detections) {
			return null
		}

		const textArray = detections.map(text => text.description).join(' ').replace(/\n/g, ' ').trim()

		const gptResponse = await chatGPTTextQuery(`
			${query}
			${textArray}
		`, gptVersion)

		return gptResponse

	} catch (error: any) {
		if (error.response && error.response.data) {
			console.error(error.response.data)
			throw new Error()
		} else {
			console.error(error)
			throw new Error()
		}
	}

}

export function getGPTBaseRezoningQuery(document: string, options?: BaseRezoningQueryParams) {

  return `
    If the provided document, is related to a rezoning, give me the following in a JSON format otherwise give an error:
    {
      rezoningId: ${options?.rezoningId ? options.rezoningId : 'the unique alphanumeric identifier for this rezoning, always a string, null if not specified'} 
      address: address in question - only street address, no city - if multiple addresses, comma separate, null if doesn't exist
      applicant: who the rezoning applicant is - if behalf exists, do not mention behalf
      behalf: if the applicant is applying on behalf of someone else, who is it
      description: a description of the rezoning and what the applicant wants to build - be specific, include numerical metrics
      type: one of single-family residential, townhouse, mixed use (only if there is residential + commercial), multi-family residential (only if there is no commercial), industrial (manufacturing, utilities, etc.), commercial, or other
      status: either applied, public hearing, approved, denied, withdrawn
      dates: {
        appliedDate: if this is an application, the date of this document in YYYY-MM-DD or null if unclear
        publicHearingDate: if this is for a public hearing, the date of this public hearing in YYYY-MM-DD or null if unclear
        approvalDate: if this is an approval, the date of this approval in YYYY-MM-DD or null if unclear
        denialDate: if this is a denial, the date of this denial in YYYY-MM-DD or null if unclear
        withdrawnDate: if this is a withdrawal, the date of this withdrawal in YYYY-MM-DD or null if unclear
      }
      stats: {
        buildings: your best guess as to the number of new buildings being proposed or null if unclear
        stratas: your best guess as to the total number of non-rental residential units/townhouses or null if unclear - default to assuming non-rental units
        rentals: total number of rental units or null if unclear - do not default to rental if not specified
        hotels: total number of hotel units (not buildings) or null if unclear
        fsr: total floor space ratio or null if unclear
				storeys: total number of storeys - pick the tallest if multiple - null if unclear
      }
      zoning: {
        previousZoningCode: city zoning code before rezoning or null if unclear - keep short
        previousZoningDescription: best description of previous zoning code (ex. low density residential)
        newZoningCode: city zoning code after rezoning or null if unclear - keep short
        newZoningDescription: best description of new zoning code (ex. high density residential)
      }
    }
    Document here: ${document}
  `

}

export function getGPTBaseRezoningTypeQuery(description: string) {
	
	return `
		Here are some descriptions of possible rezoning types:
		- single-family residential (include duplexes)
		- townhouse
		- mixed use (only if there is residential + commercial, also usually includes comprehensive developments)
		- multi-family residential
		- industrial (manufacturing, utilities, etc.)
		- commercial (offices, sales, hotels, etc.)
		- other (only if absolutely nothing else fits)

		Given the following description, give me the following in a JSON format. 
		{
			type: one of single-family residential, townhouse, mixed use, multi-family residential, industrial, commercial, or other
		}

		Description here: ${description}
	`

}

export function getGPTBaseRezoningStatsQuery(description: string) {

  return `
    Given the following description, give me the following in a JSON format - always return all fields even if null:
    {
      buildings: your best guess as to the number of new buildings being proposed - default to 1 - null if unclear - if it's a townhouse, default to 1 unless it's clear that there are multiple separated structures
      stratas: your best guess as to the total number of non-rental residential units/townhouses or null if unclear - default to assuming non-rental units - 0 if it's a commercial/industrial development
      rentals: total number of rental units - 0 if no explicit mention of rentals - null if unclear
      hotels: total number of hotel units - 0 if no explicit mention of hotels - null if unclear
      fsr: total floor space ratio or null if unclear
			storeys: total number of storeys - pick the tallest if multiple - null if unclear
    }
    Description here: ${description}
  `

}
