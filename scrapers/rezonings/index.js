// This script will go through each scraped json file and identify which ones are possibly related to rezonings or not. It will then parse through each out and produce a final output file.
const fs = require('fs')
const path = require('path')
const {} = require('./utilities')

const masterJSON = require('../index.json')

const filteredJSON = []

masterJSON.forEach((item) => {

  // BC does not have rezonings
  if (item.city === 'BC') {
    return
  }

  if (item.city === 'Vancouver') {
    if (item.title.includes('Rezoning:')) {
      filteredJSON.push(item)
    }
  }

  return item.contents && item.contents.toLowerCase().includes('rezoning')
})

console.log(`Writing file...`)
fs.writeFileSync(path.join(__dirname, 'index.json'), JSON.stringify(filteredJSON, null, 2), 'utf8')
console.log(`File saved`)
