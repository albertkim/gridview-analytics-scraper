import chalk from 'chalk'
import { IMeetingDetail } from '../../../repositories/RawRepository'
import { getSurreyLandUseMinutes } from './SurreyUtilities'
import { downloadPDF, parsePDF } from '../../PDFUtilities'
import { chatGPTPartialRezoningQuery, getGPTBaseRezoningQuery } from '../../AIUtilities'

export async function checkIfApplication(news: IMeetingDetail): Promise<boolean> {

  if (!news.minutesUrl) {
    return false
  }

  if (news.meetingType.toLowerCase() !== 'regular council land use') {
    return false
  }

  if (!news.title.toLowerCase().includes('planning report')) {
    return false
  }

  const permitNumber = news.title.replace('Planning Report', '').trim()
  const parsedMinutes = await getSurreyLandUseMinutes(news.minutesUrl)

  // Find the section that contains the permit number
  const matchingItem = parsedMinutes.find((item) => item.content.includes(permitNumber))
  if (!matchingItem) {
    return false
  }

  if (!matchingItem.content.toLowerCase().includes('rezoning')) {
    return false
  }

  if (matchingItem.section.toLowerCase().includes('land use applications')) {
    return true
  } else {
    return false
  }

}

export async function parseApplication(news: IMeetingDetail) {

  // Expect at least 1 report URL
  if (news.reportUrls.length === 0) {
    return null
  }

  const reportUrl = news.reportUrls[0].url

  const firstPagePDF = await downloadPDF(reportUrl)
  const firstPageText = await parsePDF(firstPagePDF, 1)

  // Should not include the word "memo"
  if (!firstPageText || firstPageText.toLowerCase().includes('memo')) {
    return null
  }

  const rezoningDetail = await chatGPTPartialRezoningQuery(getGPTBaseRezoningQuery(firstPageText), {analyzeType: true, analyzeStats: true})

}
