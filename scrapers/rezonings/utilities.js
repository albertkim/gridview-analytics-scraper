const axios = require('axios')
const {PDFDocument}	= require('pdf-lib')
require('dotenv').config()

const environment = process.env.NODE_ENV
const chatGPTAPIKey = process.env.CHAT_GPT_API_KEY
const chatGPTAPIUrl = process.env.CHAT_GPT_API_URL

console.log(environment, chatGPTAPIKey, chatGPTAPIUrl)

// Download a PDF from a URL and return the data
async function downloadPDF(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer'
  })
  return response.data
}

// Given a PDF file, return a new PDF file with only the first X pages 
async function generatePDF(pdfData, numberOfPages) {
	const pdfDoc = await PDFDocument.load(pdfData)
	const pageCount = pdfDoc.getPageCount()

	if (numberOfPages <= 0 || numberOfPages > pageCount) {
		throw new Error('Invalid number of pages to extract')
	}

	const newPdfDoc = await PDFDocument.create()

	for (let i = 0; i < numberOfPages; i++) {
		const page = pdfDoc.getPage(i)
		const copiedPage = await newPdfDoc.copyPage(page)
		newPdfDoc.addPage(copiedPage)
	}

	const newPdfBytes = await newPdfDoc.save()
	return newPdfBytes
}

// Given a PDF file, return an JPEG image file of the page at the given index
async function generateScreenshotFromPDF(pdfData, pageIndex) {
	const options = {
    density: 300,           // Image density in DPI (dots per inch)
    format: 'jpeg',         // Output image format (JPEG in this case)
    size: '600x800',        // Output image size (width x height)
    page: pageIndex + 1     // Page index (starting from 1)
  }

  const pdfConverter = new pdf2pic(options)

  try {
    const imageBuffer = await pdfConverter.convertBuffer(pdfData)
    return imageBuffer
  } catch (error) {
    console.error('Error converting PDF to image:', error)
    throw error
  }
}

// Send a text query to ChatGPT 3.5 turbo and get data back in JSON format
// Make sure that the query includes the word 'JSON'
async function chatGPTTextQuery(query) {
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
	const response = await axios.post(chatGPTAPIUrl, payload, {
		headers: {
			Authorization: `Bearer ${chatGPTAPIKey}`
		}
	})
	return response.data
}

// Send a text + file query to ChatGPT 4 turbo and get data back in JSON format
async function chatGPTDataQuery(query, fileData) {
	const payload = {
		model: 'gpt-4-turbo-1106',
		messages:[
			{
				'role': 'user',
				'content': query
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
	const response = await axios.post(chatGPTAPIUrl, payload, {
		headers: {
			Authorization: `Bearer ${chatGPTAPIKey}`
		}
	})
	return response.data
}

module.exports = {
	downloadPDF,
	generatePDF,
	generateScreenshotFromPDF,
	chatGPTTextQuery,
	chatGPTDataQuery
}
