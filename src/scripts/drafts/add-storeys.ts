import fs from 'fs'
import path from 'path'
import { IFullRezoningDetail } from '../../repositories/RezoningsRepository'

const directory = path.join(__dirname, '../database/rezonings.json')
console.log(directory)

const rezonings = require(directory)

const newRezonings = rezonings.map((rezoning: IFullRezoningDetail) => {
  rezoning.stats.storeys = null
  return rezoning
})

fs.writeFileSync(directory, JSON.stringify(newRezonings, null, 2))
