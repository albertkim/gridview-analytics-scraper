const axios = require('axios')
const OpenAI = require('openai')
const pdfParse = require('pdf-parse')
const {PDFDocument}	= require('pdf-lib')
const { parse } = require('dotenv')
require('dotenv').config()

const environment = process.env.NODE_ENV
const chatGPTAPIKey = process.env.CHAT_GPT_API_KEY
const chatGPTAPIUrl = process.env.CHAT_GPT_API_URL

const openai = new OpenAI({
	apiKey: chatGPTAPIKey
})

console.log(environment, chatGPTAPIKey, chatGPTAPIUrl)

// Download a PDF from a URL and return the data
async function downloadPDF(url) {
	console.log(`Downloading PDF from ${url}`)
  const response = await axios.get(url, {
    responseType: 'arraybuffer'
  })
	console.log(`Downloaded, file size is ${Math.round(response.data.length / 1024)} kb}`)
  return response.data
}

// Given a PDF file, return a new text array with only the pages that have selectable text
async function generatePDFTextArray(pdfData, options = {}) {
	const minCharacterCount = options.minCharacterCount || 5
	const expectedWords = options.expectedWords || []
	const pdfDoc = await PDFDocument.load(pdfData)
	const pageCount = pdfDoc.getPageCount()
	console.log(`Original PDF page count is ${pageCount}`)

	const finalPDFTextArray = []

	for (let i = 0; i < pageCount; i++) {
		// For each page, create a new single-page PDF to parse text
		const singlePagePDF = await PDFDocument.create()
		const [copiedPage] = await singlePagePDF.copyPages(pdfDoc, [i])
		singlePagePDF.addPage(copiedPage)
		const singlePagePDFBytes = await singlePagePDF.save()
		const pageText = (await pdfParse(singlePagePDFBytes)).text
		if (pageText.replace(/\s/g, '').length > minCharacterCount && expectedWords.every(word => pageText.toLowerCase().includes(word.toLowerCase()))) {
			finalPDFTextArray.push(pageText)
		}
	}

	console.log(`Final PDF text array count is ${finalPDFTextArray.length}`)
	return finalPDFTextArray
}

// Given a PDF file, return a PDF with only the pages that have selectable text
async function generatePDF(pdfData, options = {}) {
	const minCharacterCount = options.minCharacterCount || 5
	const expectedWords = options.expectedWords || []
	const maxPages = options.maxPages || null
	const pdfDoc = await PDFDocument.load(pdfData)
	const pageCount = pdfDoc.getPageCount()
	console.log(`Original PDF page count is ${pageCount}`)

	const finalPDF = await PDFDocument.create()

	for (let i = 0; i < (maxPages !== null ? Math.min(pageCount, maxPages) : pageCount); i++) {
		// For each page, create a new single-page PDF to parse text
		const singlePagePDF = await PDFDocument.create()
		const [copiedPage] = await singlePagePDF.copyPages(pdfDoc, [i])
		singlePagePDF.addPage(copiedPage)
		const singlePagePDFBytes = await singlePagePDF.save()
		const pageText = (await pdfParse(singlePagePDFBytes)).text
		if (pageText.replace(/\s/g, '').length > minCharacterCount && expectedWords.every(word => pageText.toLowerCase().includes(word.toLowerCase()))) {
			const [copiedPage] = await finalPDF.copyPages(pdfDoc, [i])
			const page = finalPDF.addPage(copiedPage)
		}
	}

	const finalPDFBytes = await finalPDF.save()

	console.log(`Final PDF page count is ${finalPDF.getPageCount()}, file size is ${Math.round(finalPDFBytes.length / 1024)} kb`)
	return finalPDFBytes
}

// Given a PDF file, return an JPEG image file of the page at the given index
async function generateScreenshotFromPDF(pdfData, pageIndex) {
	console.log(`Generating screenshot of page ${pageIndex}`)
	const options = {
    density: 300,           // Image density in DPI (dots per inch)
    format: 'jpeg',         // Output image format (JPEG in this case)
    size: '600x800',        // Output image size (width x height)
    page: pageIndex + 1     // Page index (starting from 1)
  }

  const pdfConverter = new pdf2pic(options)

  try {
    const imageBuffer = await pdfConverter.convertBuffer(pdfData)
		console.log(`Generated`)
    return imageBuffer
  } catch (error) {
    console.error('Error converting PDF to image:', error)
    throw error
  }
}

async function parsePDF(pdfData) {
	console.log(`Parsing PDF`)
	const parsedPDF = await pdfParse(pdfData)
	return parsedPDF
}

// Send a text query to ChatGPT 3.5 turbo and get data back in JSON format
// Make sure that the query includes the word 'JSON'
async function chatGPTTextQuery(query) {
	console.log(`Sending text query to ChatGPT`)

  const payload = {
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
  }
	try {
		const response = await openai.chat.completions.create(payload)
		return response
	} catch (error) {
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
async function chatGPTDataQuery(query, fileData) {
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
	} catch (error) {
		if (error.response && error.response.data) {
			console.error(error.response.data)
			throw new Error()
		} else {
			throw new Error()
		}
	}
}

module.exports = {
	downloadPDF,
	generatePDFTextArray,
	generatePDF,
	generateScreenshotFromPDF,
	parsePDF,
	chatGPTTextQuery,
	chatGPTDataQuery
}
