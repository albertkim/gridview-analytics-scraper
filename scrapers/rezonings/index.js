// This script will go through each scraped json file and identify which ones are possibly related to rezonings or not. It will then parse through each out and produce a final output file.

const masterJSON = require('../index.json')

const filteredJSON = []

masterJSON.forEach((item) => {

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
