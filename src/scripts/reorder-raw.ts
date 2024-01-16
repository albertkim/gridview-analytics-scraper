import { RawRepository } from '../repositories/RawRepository'

(async () => {

  const news = RawRepository.getNews()
  RawRepository.dangerouslyUpdateAllNews(news)

})()
