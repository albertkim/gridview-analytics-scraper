import dotenv from 'dotenv'
import OpenAI from 'openai'
import chalk from 'chalk'
import { ImageAnnotatorClient } from '@google-cloud/vision'

dotenv.config()

const chatGPTAPIKey = process.env.CHAT_GPT_API_KEY!

const openai = new OpenAI({
	apiKey: chatGPTAPIKey
})

// Uses the GOOGLE_APPLICATION_CREDENTIALS environment variable
const googleVisionClient = new ImageAnnotatorClient()

interface BaseRezoningQueryParams {
	introduction?: string
  applicationId?: string
	status?: string
}

// Send a text query to ChatGPT 3.5 turbo and get data back in JSON format
// Make sure that the query includes the word 'JSON'
// Defaults to 3.5, specify 4 if you want to use 4
export async function chatGPTJSONQuery(query: string, gptVersion?: '3.5' | '4'): Promise<any | null> {

	// Only log if using GPT 4 - otherwise too verbose
	if (gptVersion === '4') {
		console.log(`Sending JSON query to ChatGPT ${gptVersion || '3.5'}`)
	}

	const gptVersionMapping = {
		'3.5': 'gpt-3.5-turbo-0125',
		'4': 'gpt-4-0125-preview'
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
			console.log(chalk.yellow(JSON.stringify(content, null, 2)))
			return null
		}

		return content

	} catch (error: any) {
		if (error.response && error.response.data) {
			console.error(chalk.red(error.response.data))
		} else {
			console.error(chalk.red(error))
		}
		return null
	}
}

// Return in text format, not JSON
export async function chatGPTTextQuery(query: string, gptVersion?: '3.5' | '4'): Promise<string | null> {

	// Only log if using GPT 4 - otherwise too verbose
	if (gptVersion === '4') {
		console.log(`Sending text query to ChatGPT ${gptVersion || '3.5'}`)
	}

	const gptVersionMapping = {
		'3.5': 'gpt-3.5-turbo',
		'4': 'gpt-4-turbo-preview'
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
			temperature: 0.2
		})

		if (!response) {
			return null
		}

		const content = response.choices[0].message.content
		return content

	} catch (error: any) {
		if (error.response && error.response.data) {
			console.error(chalk.red(error.response.data))
		} else {
			console.error(chalk.red(error))
		}
		return null
	}
}

export async function imageTextQuery(query: string, fileData: string, gptVersion?: '3.5' | '4') {

	try {

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
		Carefully read the provided document and give me the following in a JSON format - otherwise return a {error: message, reason: detailed explanation}.
		${options?.introduction ? options.introduction : ''}
    {
      applicationId: ${options?.applicationId ? options.applicationId : 'the unique alphanumeric identifier for this rezoning, always a string, null if not specified'} 
      address: address in question - only street address, no city - if multiple addresses, comma separate, null if doesn't exist
      applicant: who the rezoning applicant is
      behalf: if the applicant is applying on behalf of someone else, who is it - null if doesn't exist
      description: a description of the rezoning and what the applicant wants to build - be specific, include numerical metrics
      buildingType: one of single-family residential (including duplexes), townhouse, mixed use (only if there is residential + commercial), multi-family residential (only if there is no commercial), industrial (manufacturing, utilities, etc.), commercial, or other
      status: ${options?.status ? options.status : 'one of applied, public hearing, approved, denied, withdrawn'} 
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
			buildingType: one of single-family residential, townhouse, mixed use, multi-family residential, industrial, commercial, or other
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
