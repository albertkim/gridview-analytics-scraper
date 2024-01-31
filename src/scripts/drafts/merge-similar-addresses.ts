import { IFullRezoningDetail, RecordsRepository, mergeEntries } from '../../repositories/RecordsRepository'

// NOTE: Due to array handling complexity, this only merges one address at a time
(async () =>{

  const rezonings = RecordsRepository.getRecords('rezoning')

  interface ISimilarAddressStructure {
    index: number
    rezoning: IFullRezoningDetail
    similarAddressRezonings: {
      index: number
      rezoning: IFullRezoningDetail
      similarity: number
    }[]
  }

  let rezoningWithSimilarAddresses: ISimilarAddressStructure | null = null

  for (let i = 0; i < rezonings.length; i++) {
    const rezoning = rezonings[i]
    const similarAddressRezonings = RecordsRepository.getRecordsWithSimilarAddresses('rezoning', rezoning)
    if (similarAddressRezonings.length > 0) {
      rezoningWithSimilarAddresses = {
        index: i,
        rezoning: rezoning,
        similarAddressRezonings: similarAddressRezonings
      }
      break
    }
  }

  if (rezoningWithSimilarAddresses) {

    console.log('Original rezoning')
    console.log(rezoningWithSimilarAddresses.rezoning.address)
    console.log('Address matches')
    console.log(rezoningWithSimilarAddresses.similarAddressRezonings.map((similarAddressRezoning) => similarAddressRezoning.rezoning.address))

    // Merge into the first entry
    let mergedEntry = rezoningWithSimilarAddresses.rezoning
    rezoningWithSimilarAddresses.similarAddressRezonings.forEach((similarAddressRezoning) => {
      mergedEntry = mergeEntries(mergedEntry, similarAddressRezoning.rezoning)
    })
    console.log('Final entry')
    console.log(mergedEntry)

    // Update the rezoning to merge into
    rezonings[rezoningWithSimilarAddresses.index] = mergedEntry
    
    // Remove the other entries
    function removeMultipleIndices(array: any[], indices: number[]) {
      return array.filter((_, index) => !indices.includes(index))
    }
    const indicesToRemove = rezoningWithSimilarAddresses.similarAddressRezonings
      .map((similarAddressRezoning) => similarAddressRezoning.index)
    const updatedRezonings = removeMultipleIndices(rezonings, indicesToRemove)

    // Update the database
    console.log(`Previous database length: ${rezonings.length}`)
    console.log(`Previous database length: ${updatedRezonings.length}`)
    RecordsRepository.dangerouslyUpdateAllRecords('rezoning', updatedRezonings)

  }

})()
