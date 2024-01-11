import fs from 'fs'
import path from 'path'
import '../database/errors.json'
import { IMeetingDetail } from './RawRepository'

export const ErrorsRepository = {

  getErrors() {
    const errors = require('../database/errors.json') as IMeetingDetail[]
    return errors
  },

  addError(news: IMeetingDetail) {
    const previousErrors = this.getErrors()
    const newData = [...previousErrors, news]
    fs.writeFileSync(
      path.join(__dirname, '../database/errors.json'),
      JSON.stringify(newData, null, 2),
      'utf8'
    )
  }

}
