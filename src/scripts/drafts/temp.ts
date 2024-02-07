import { parseSurreyMeetingMinutes } from '../../scraper/cities/Surrey/SurreyUtilities'
import fs from 'fs'
import path from 'path'

(async () => {

  const parsed = await parseSurreyMeetingMinutes('https://www.surrey.ca/sites/default/files/minutes/MIN-RCPH-2024-01-15.pdf')

  fs.writeFileSync(path.join(__dirname, 'surrey-meeting-minutes.json'), JSON.stringify(parsed, null, 2))

})()
