import dotenv from 'dotenv'
import OpenAI from 'openai'
import { ImageAnnotatorClient } from '@google-cloud/vision'

dotenv.config()

const environment = process.env.NODE_ENV!
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
	console.log(`Sending text query to ChatGPT`)

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
    Read this document and give me the following in a JSON format:
    {
      rezoningId: ${options?.rezoningId ? options.rezoningId : 'the unique alphanumeric identifier for this rezoning, null if not specified'} 
      address: address in question - only street address, no city - if multiple addresses, comma separate, null if doesn't exist
      applicant: who the rezoning applicant is - if behalf exists, do not mention behalf
      behalf: if the applicant is applying on behalf of someone else, who is it
      description: a description of the rezoning and what the applicant wants to build - be specific, include numerical metrics
      type: one of single-family residential, townhouse, mixed use (only if there is residential + commercial), multi-family residential (only if there is no commercial), industrial, commercial, or other
      stats: {
        buildings: your best guess as to the number of new buildings being proposed or null if unclear
        stratas: your best guess as to the total number of non-rental residential units/townhouses or null if unclear - default to assuming non-rental units
        rentals: total number of rental units or null if unclear - do not default to rental if not specified
        hotels: total number of hotel units (not buildings) or null if unclear
        fsr: total floor space ratio or null if unclear
      }
      zoning: {
        previousZoningCode: city zoning code before rezoning or null if unclear
        previousZoningDescription: best description of previous zoning code (ex. low density residential)
        newZoningCode: city zoning code after rezoning or null if unclear
        newZoningDescription: best description of new zoning code (ex. high density residential)
      }
      status: either applied, pending, public hearing, approved, denied, withdrawn
      dates: {
        appliedDate: if this is an application, the date of this document in YYYY-MM-DD or null if unclear
        publicHearingDate: if this is for a public hearing, the date of this public hearing in YYYY-MM-DD or null if unclear
        approvalDate: if this is an approval, the date of this approval in YYYY-MM-DD or null if unclear
        denialDate: if this is a denial, the date of this denial in YYYY-MM-DD or null if unclear
        withdrawnDate: if this is a withdrawal, the date of this withdrawal in YYYY-MM-DD or null if unclear
      }
    }
    If this document is not a rezoning related document, please reply with "not rezoning". Document here: ${document}
  `

}

export function getGPTBaseRezoningStatsQuery(description: string) {

  return `
    Given the following description, give me the following in a JSON format:
    {
      buildings: your best guess as to the number of new buildings being proposed - default to 1 - null if unclear - if it's a townhouse, default to 1 unless it's clear that there are multiple separated structures
      stratas: your best guess as to the total number of non-rental residential units/townhouses or null if unclear - default to assuming non-rental units - 0 if it's a commercial/industrial development
      rentals: total number of rental units - 0 if no explicit mention of rentals - null if unclear
      hotels: total number of hotel units - 0 if no explicit mention of hotels - null if unclear
      fsr: total floor space ratio or null if unclear
    }
    Description here: ${description}
  `

}