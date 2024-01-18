import fs from 'fs'
import path from 'path'
import { IMeetingDetail } from './RawRepository'

export const ErrorsRepository = {

  getErrors() {
    const errors = JSON.parse(fs.readFileSync(path.join(__dirname, '../database/errors.json'), 'utf8')) as IMeetingDetail[]
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
