import { Page } from 'puppeteer'
import { IMeetingDetail } from '../../../repositories/RawRepository'

interface IPartialMeetingDetails {
  title: string
  resolutionId: null
  contents: string
  reportUrls: {
      title: string
      url: string
  }[]
}

export async function getMeetingDetailsAfterMar2020(page: Page, url: string, date: string, meetingType: string): Promise<IMeetingDetail[]> {

  await page.goto(url)
  await new Promise((resolve) => {setTimeout(resolve, 3000)})

  const results = await page.evaluate(async () => {

    // Get the list items
    const itemElements = $('.AgendaItemContainer:has(> .AgendaItem > .AgendaItemTitleRow > .AgendaItemIcons > a:visible)').filter((index, element) => {
      $(element).children().each((index, childElement) => {
        const hasEmptyClass = $(childElement).hasClass('')
        if (hasEmptyClass) return false
      })
      return true
    }).get()

    const items: IPartialMeetingDetails[] = []

    for (const item of itemElements) {
      let title = $(item).find('a').first().text().replace(/\s+/g, ' ').replace(/[\n\r]/g, '').trim()
      if (title) title = title.trim()
      // Get the parent label - first parent is div, previous element to that is the parent label
      const parentLabel = $(item).parents().prev().first().find('.AgendaItemTitle').text().replace(/\s+/g, ' ').replace(/[\n\r]/g, '').trim()
      const contents = $(item).find('.AgendaItemDescription').text().replace(/\s+/g, ' ').replace(/[\n\r]/g, '').trim()

      if (!title || !parentLabel || !contents) continue

      // Clicking the item opens up a floating panel with links. Also changes URL.
      const hrefJavascript = $(item).find('.AgendaItemTitle a').attr('href')!
      // Regular jQuery click code doesn't work because these links execute javascript in the href instead
      eval(hrefJavascript.replace('javascript:', ''))
      await new Promise((resolve) => {setTimeout(resolve, 2000)})

      const reportUrls = $('.AgendaItemSelectedDetails').find('.AgendaItemAttachment a:visible').map((index, element) => {
        return {
          title: $(element).text(),
          url: new URL($(element).attr('href')!, window.location.origin).href
        }
      }).get()

      items.push({
        title: `${parentLabel} - ${title}`,
        resolutionId: null,
        contents: contents,
        reportUrls: reportUrls
      })
    }

    return items
  })

  return results.map((r) => {
    return {
      city: 'Burnaby',
      metroCity: 'Metro Vancouver',
      url: page.url(),
      ...r,
      date: date,
      meetingType: meetingType,
      minutesUrl: url
    }
  })

}

export async function getMeetingDetailsBeforeMar2020(page: Page, url: string, date: string, meetingType: string): Promise<IMeetingDetail[]> {

  await page.goto(url)
  await new Promise((resolve) => {setTimeout(resolve, 3000)})

  const results = await page.evaluate(async () => {

    // Get the list items
    const itemElements = $('.WordSection1').find('.MsoNormalTable:has(a[href="#"]:visible)').get()

    const items: IPartialMeetingDetails[] = []

    for (const item of itemElements) {
      const title = $(item).find('tr:eq(0) td:eq(1) p')
        .map((index, element) => $(element).text())
        .get().join(' - ')
        .replace(/\s+/g, ' ') // Replace consecutive spaces
        .replace(/[\r\n]+/g, '').trim() // Remove special characters

      // Get the parent label - check previous siblings and find a table where the first tr has an a tag with no href
      const parentLabel = $(item)
        .prevAll('.MsoNormalTable:not(:has(.SelectableItem))')
        .first().find('tr td:eq(1)').text()
        .replace(/\s+/g, ' ')
        .replace(/[\r\n]+/g, '').trim()

      // Contents may be empty for legacy entries
      const contents = $(item).find('tr:eq(2)').text()
        .replace(/\s+/g, ' ')
        .replace(/[\n\r]/g, '').trim() || ''

      if (!title || !parentLabel) continue

      // Clicking the item opens up a floating panel with links. Also changes URL.
      const itemLink = $(item).find('a')
      itemLink.trigger('click')
      await new Promise((resolve) => {setTimeout(resolve, 1000)})

      const reportUrls = $('.AgendaItemSelectedDetails').find('.AgendaItemAttachment:not(:hidden) a').map((index, element) => {
        return {
          title: $(element).text().replace(/\s+/g, ' ').replace(/[\n\r]/g, '').trim(),
          url: new URL($(element).attr('href')!, window.location.origin).href
        }
      }).get()

      items.push({
        title: `${parentLabel} - ${title}`,
        resolutionId: null,
        contents: contents,
        reportUrls: reportUrls
      })
    }

    return items
  })

  return results.map((r) => {
    return {
      city: 'Burnaby',
      metroCity: 'Metro Vancouver',
      url: page.url(),
      ...r,
      date: date,
      meetingType: meetingType,
      minutesUrl: url
    }
  })

}
