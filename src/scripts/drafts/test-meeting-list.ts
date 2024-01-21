import puppeteer from 'puppeteer'
import { getMeetingDetailsAfterMar2020 } from '../../scraper/cities/Burnaby/GetMeetingDetails'

(async () => {

  const browser = await puppeteer.launch({
    headless: false
  })

  const page = await browser.newPage()

  page.setViewport({
    width: 1980,
    height: 1080
  })

  const results = await getMeetingDetailsAfterMar2020(page, 'https://pub-burnaby.escribemeetings.com/Meeting.aspx?Id=479f75c3-cd3b-4d8c-a8a7-fea0c55e2e2a&Agenda=Agenda&lang=English&Item=24&Tab=attachments', '2020-07-20', 'City Council Meeting')

  console.log(results)

  browser.close()

})()
