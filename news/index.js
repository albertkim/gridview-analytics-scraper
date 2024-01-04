const fs = require('fs')
const path = require('path')

const BC = require('./scrapers/BC.json')
const Vancouver = require('./scrapers/Vancouver.json')
const Richmond = require('./scrapers/Richmond.json')
const Burnaby = require('./scrapers/Burnaby.json')

const masterJSON = [...BC, ...Vancouver, ...Richmond, ...Burnaby]

console.log(`Writing file...`)
fs.writeFileSync(path.join(__dirname, 'index.json'), JSON.stringify(masterJSON, null, 2), 'utf8')
console.log(`File saved`)
