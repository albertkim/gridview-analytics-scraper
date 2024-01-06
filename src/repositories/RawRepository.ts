export interface IMeetingDetail {
  city: string
  metroCity: string | null
  url: string
  date: string
  meetingType: string
  title: string
  resolutionId: string | null
  contents: string
  minutesUrl: string | null
  reportUrls: Array<{
    title: string
    url: string
  }>
}
