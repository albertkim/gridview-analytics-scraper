import dotenv from 'dotenv'
import axios from 'axios'
import OpenAI from 'openai'

dotenv.config()

const environment = process.env.NODE_ENV!
const chatGPTAPIKey = process.env.CHAT_GPT_API_KEY!
const chatGPTAPIUrl = process.env.CHAT_GPT_API_URL!

const openai = new OpenAI({
	apiKey: chatGPTAPIKey
})

interface BaseRezoningQueryParams {
  rezoningId?: string
}

// Send a text query to ChatGPT 3.5 turbo and get data back in JSON format
// Make sure that the query includes the word 'JSON'
export async function chatGPTTextQuery(query: string) {
	console.log(`Sending text query to ChatGPT`)

	try {
		const response = await openai.chat.completions.create({
			model: 'gpt-3.5-turbo-1106',
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
		return response
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

// Send a text + file query to ChatGPT 4 turbo and get data back in JSON format
export async function chatGPTDataQuery(query: string, fileData: Buffer) {
	console.log(`Sending data query to ChatGPT`)
	const payload = {
		model: 'gpt-4-vision-preview',
		messages: [
			{
				'role': 'user',
				'content': [
					{
						'type': 'text',
						'text': query
					},
					{
						'type': 'image_url',
						'image_url': {
							'url': ''
						}
					}
				]
			}
		],
		response_format: {
			type: 'json_object'
		},
		files: [
			{
				'name': 'file',
				'data': fileData
			}
		],
		temperature: 0.2
	}
	try {
		const response = await axios.post(chatGPTAPIUrl, payload, {
			headers: {
				Authorization: `Bearer ${chatGPTAPIKey}`
			}
		})
		return response.data
	} catch (error: any) {
		if (error.response && error.response.data) {
			console.error(error.response.data)
			throw new Error()
		} else {
			throw new Error()
		}
	}
}

export function getGPTBaseRezoningQuery(document: string, options?: BaseRezoningQueryParams) {

  return `
    Read this document and give me the following in a JSON format:
    {
      rezoningId: ${options?.rezoningId ? options.rezoningId : 'the unique alphanumeric identifier for this rezoning, null if not specified'} 
      address: address in question - if multiple addresses, comma separate, null if doesn't exist
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
        height: height in meters or null if unclear
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
      buildings: your best guess as to the number of new buildings being proposed or null if unclear - if it's a townhouse, default to 1 unless it's clear that there are multiple separated structures
      stratas: your best guess as to the total number of non-rental residential units/townhouses or null if unclear - default to assuming non-rental units
      rentals: total number of rental units or null if unclear - do not default to rental if not specified
      hotels: total number of hotel units or null if unclear - do not default to hotel if not specified
      fsr: total floor space ratio or null if unclear
      height: height in meters or null if unclear
    }
    Description here: ${description}
  `

}
