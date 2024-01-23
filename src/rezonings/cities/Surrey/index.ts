import { RawRepository } from '../../../repositories/RawRepository'

export async function analyze() {

  const news = RawRepository.getNews({city: 'Surrey'})

  // Get an land use meeting minutes and get the rezoning items
  const landUseMinutes = news.filter((item) => {
    return item.title.toLowerCase().includes('planning report') && item.meetingType.toLowerCase() === 'regular council land use'
  })

  // Applications

  // Public hearings

  // Bylaws

}

analyze()
