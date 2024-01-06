const fs = require('fs')
const path = require('path')
const moment = require('moment')

const BC = require('./BC.json')
const Vancouver = require('./Vancouver.json')
const Richmond = require('./Richmond.json')
const Burnaby = require('./Burnaby.json')

const masterJSONRaw = [...BC, ...Vancouver, ...Richmond, ...Burnaby]

// re-organize fields and order by date
const masterJSON = masterJSONRaw.map(item => {
  return {
    city: item.city || null,
    metroCity: item.metroCity || null,
    date: item.date ? moment(item.date).format('YYYY-MM-DD') : null,
    url: item.url || null,
    minutesUrl: item.minutesUrl || null,
    meetingType: item.meetingType || null,
    resolutionId: item.resolutionId || null,
    title: item.title || null,
    contents: item.contents || null,
    reportUrls: item.reportUrls.map((reportUrl) => {
      return {
        title: reportUrl.title || null,
        url: reportUrl.url || null
      }
    })
  }
})
.sort((a, b) => moment(b.date, 'YYYY-MM-DD').diff(moment(a.date, 'YYYY-MM-DD')))

// Save the total combined file as index.json
console.log(`Writing file...`)
fs.writeFileSync(path.join(__dirname, 'index.json'), JSON.stringify(masterJSON, null, 2), 'utf8')
console.log(`File saved`)

// Create a file that only has the past 30 days worth of news
const past30Days = masterJSON.filter((item) => moment(item.date).isAfter(moment().subtract(30, 'days')))
console.log(`Writing file...`)
fs.writeFileSync(path.join(__dirname, 'index-past-30.json'), JSON.stringify(past30Days, null, 2), 'utf8')
console.log(`File saved`)
