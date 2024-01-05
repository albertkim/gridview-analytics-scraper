const axios = require('axios')
const OpenAI = require('openai')
const pdfParse = require('pdf-parse')
const {PDFDocument}	= require('pdf-lib')
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

async function generateOnlyTextBasedPDF(pdfData) {
	const pdfDoc = await PDFDocument.load(pdfData)
	const pageCount = pdfDoc.getPageCount()
	for (let i = pageCount - 1; i >= 0; i--) {
		const page = pdfDoc.getPage(i)
		const textContent = await page.getTextContent()
		if (textContent.items.length === 0) {
			// Page has no selectable text, so remove it
			pdfDoc.removePage(i)
		}
	}
	const modifiedPdfBytes = await pdfDoc.save()
}

// Given a PDF file, return a new PDF file with only the first X pages 
async function generatePDF(pdfData, numberOfPages) {
	const pdfDoc = await PDFDocument.load(pdfData)
	const pageCount = pdfDoc.getPageCount()

	const actualNumberOfPages = Math.min(numberOfPages, pageCount)
	console.log(`Generating PDF with ${actualNumberOfPages} pages`)

	const newPdfDoc = await PDFDocument.create()

	for (let i = 0; i < actualNumberOfPages; i++) {
		const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [i])
		const page = newPdfDoc.addPage(copiedPage)
	}

	const newPdfBytes = await newPdfDoc.save()
	console.log(`Generated new PDF, file size is ${Math.round(newPdfBytes.length / 1024)} kb`)
	return newPdfBytes
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
	console.log(`Parsed PDF`)
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
	generateOnlyTextBasedPDF,
	generatePDF,
	generateScreenshotFromPDF,
	parsePDF,
	chatGPTTextQuery,
	chatGPTDataQuery
}
