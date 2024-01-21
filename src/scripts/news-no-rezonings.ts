import chalk from 'chalk'
import { IMeetingDetail, RawRepository } from '../repositories/RawRepository'
import { IFullRezoningDetail, RezoningsRepository } from '../repositories/RezoningsRepository'

// Vancouver imports
import { checkIfApplication as vancouverCheckIfApplication, parseApplication as vancouverParseApplication } from '../rezonings/cities/Vancouver/Applications'
import { checkIfPublicHearing as vancouverCheckIfPublicHearing, parsePublicHearing as vancouverParsePublicHearing } from '../rezonings/cities/Vancouver/PublicHearings'
import { checkIfBylaw as vancouverCheckIfBylaw, parseBylaw as vancouverParseBylaw } from '../rezonings/cities/Vancouver/Bylaws'

// Burnaby imports
import { checkIfApplication as burnabyCheckIfApplication, parseApplication as burnabyParseApplication } from '../rezonings/cities/Burnaby/Applications'
import { checkIfPublicHearing as burnabyCheckIfPublicHearing, parsePublicHearing as burnabyParsePublicHearing } from '../rezonings/cities/Burnaby/PublicHearings'
import { checkIfBylaw as burnabyCheckIfBylaw, parseBylaw as burnabyParseBylaw } from '../rezonings/cities/Burnaby/Bylaws'

// Richmond imports
import { checkIfApplication as richmondCheckIfApplication, parseApplication as richmondParseApplication } from '../rezonings/cities/Richmond/Applications'
import { checkIfPublicHearing as richmondCheckIfPublicHearing, parsePublicHearing as richmondParsePublicHearing } from '../rezonings/cities/Richmond/PublicHearings'
import { checkIfBylaw as richmondCheckIfBylaw, parseBylaw as richmondParseBylaw } from '../rezonings/cities/Richmond/Bylaws'

// Purpose: For a given city, find how many of the rezoning-checked news items are not in the rezonings database
// Accomplish that by checking for existance of the minutes URL
// Change cities by updating the confiruations below

const city: CityType = 'Richmond'
const updateApplications: boolean = false
const updatePublicHearings: boolean = false
const updateBylaws: boolean = false

// --------------------------------------------------

type CityType = 'Vancouver' | 'Burnaby' | 'Richmond'

interface IFunctionCityMapping {

  checkIfApplication: { [key in CityType]: (news: IMeetingDetail) => boolean }
  checkIfPublicHearing: { [key in CityType]: (news: IMeetingDetail) => boolean }
  checkIfBylaw: { [key in CityType]: (news: IMeetingDetail) => boolean }

  parseApplication: { [key in CityType]: (news: IMeetingDetail) => Promise<IFullRezoningDetail | null> }
  parsePublicHearing: { [key in CityType]: (news: IMeetingDetail) => Promise<IFullRezoningDetail | null> }
  parseBylaw: { [key in CityType]: (news: IMeetingDetail) => Promise<IFullRezoningDetail | IFullRezoningDetail[] | null> }

}

async function main() {

  const functionCityMapping: IFunctionCityMapping = {
    checkIfApplication: {
      Vancouver: vancouverCheckIfApplication,
      Burnaby: burnabyCheckIfApplication,
      Richmond: richmondCheckIfApplication
    },
    parseApplication: {
      Vancouver: vancouverParseApplication,
      Burnaby: burnabyParseApplication,
      Richmond: richmondParseApplication
    },
    checkIfPublicHearing: {
      Vancouver: vancouverCheckIfPublicHearing,
      Burnaby: burnabyCheckIfPublicHearing,
      Richmond: richmondCheckIfPublicHearing
    },
    parsePublicHearing: {
      Vancouver: vancouverParsePublicHearing,
      Burnaby: burnabyParsePublicHearing,
      Richmond: richmondParsePublicHearing
    },
    checkIfBylaw: {
      Vancouver: vancouverCheckIfBylaw,
      Burnaby: burnabyCheckIfBylaw,
      Richmond: richmondCheckIfBylaw
    },
    parseBylaw: {
      Vancouver: vancouverParseBylaw,
      Burnaby: burnabyParseBylaw,
      Richmond: richmondParseBylaw
    }
  }

  const news = RawRepository.getNews({city: city})
  const rezonings = RezoningsRepository.getRezonings({city: city})

  // Application checks
  const applicationNews = news.filter((n) => functionCityMapping.checkIfApplication[city](n))
  const noApplicationNews = applicationNews.filter((n) => {
    return !rezonings.find((r) => r.minutesUrls.some((u) => u.url === n.minutesUrl))
  })

  // Public hearing checks
  const publicHearingNews = news.filter((n) => functionCityMapping.checkIfPublicHearing[city](n))
  const noPublicHearingNews = publicHearingNews.filter((n) => {
    return !rezonings.find((r) => r.minutesUrls.some((u) => u.url === n.minutesUrl))
  })

  // Bylaw checks
  const bylawNews = news.filter((n) => functionCityMapping.checkIfBylaw[city](n))
  const noBylawNews = bylawNews.filter((n) => {
    return !rezonings.find((r) => r.minutesUrls.some((u) => u.url === n.minutesUrl))
  })

  console.log()
  console.log(`Application news items with no rezonings: ${chalk.white(noApplicationNews.length)}`)
  noApplicationNews.forEach((n) => {
    console.log(chalk.yellow(n.date) + ' ' + chalk.yellow(n.title) + ' ' + chalk.white(n.minutesUrl))
  })
  console.log()
  console.log(`Public hearing news items with no rezonings: ${chalk.white(noPublicHearingNews.length)}`)
  noPublicHearingNews.forEach((n) => {
    console.log(chalk.yellow(n.date) + ' ' + chalk.yellow(n.title) + ' ' + chalk.white(n.minutesUrl))
  })
  console.log()
  console.log(`Bylaw news items with no rezonings: ${chalk.white(noBylawNews.length)}`)
  noBylawNews.forEach((n) => {
    console.log(chalk.yellow(n.date) + ' ' + chalk.white(n.minutesUrl))
  })
  console.log()

  // Update rezonings database if settings are enabled

  if (updateApplications) {
    for (const n of applicationNews) {
      const parsed = await functionCityMapping.parseApplication[city](n)
      if (parsed) {
        await RezoningsRepository.upsertRezonings([parsed])
      }
    }
  }

  if (updatePublicHearings) {
    for (const n of publicHearingNews) {
      const parsed = await functionCityMapping.parsePublicHearing[city](n)
      if (parsed) {
        await RezoningsRepository.upsertRezonings([parsed])
      }
    }
  }

  if (updateBylaws) {
    for (const n of bylawNews) {
      const parsed = await functionCityMapping.parseBylaw[city](n)
      // check if parsed is an array or not
      if (parsed && Array.isArray(parsed)) {
        await RezoningsRepository.upsertRezonings(parsed)
      } else if (parsed) {
        await RezoningsRepository.upsertRezonings([parsed])
      }
    }
  }

}

main()
