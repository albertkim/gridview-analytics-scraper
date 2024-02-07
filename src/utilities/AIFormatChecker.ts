import chalk from 'chalk'

export interface IExpectedFormat {
  type: 'array' | 'object' | 'string' | 'number' | 'boolean'
  required: boolean // if false, value can be null (but not undefined)
  possibleValues?: string[] // if type is string
  fields?: {
    [key: string]: IExpectedFormat // if type is object
  }
  elementType?: IExpectedFormat // if type is array
}

// A generalized function to check and fix the format of a GPT response
// It will also try to correct the data by mutating the object
// Ex. if field doesn't exist, add null field, if a string field is "null", "unclear", or "unknown", change it to null, if a string field is a number, change it to a string, if a number field is a string, change it to a number, if a string field is an object, change it toa stringified object
// The return value is a boolean indicating if the object is in the expected format
export function checkAndFixAIResponse(object: any, format: IExpectedFormat) {

  if (object === null || object === undefined) {
    console.log(chalk.yellow(`Root object is null or undefined`))
    return false
  }

  return checkTypeAndFix({ root: object }, 'root', { ...format, required: true })

}

function checkTypeAndFix(parent: any, key: string | number, format: IExpectedFormat): boolean {

  let isValid = true
  let value = parent[key]

  // If value is required but missing, set it to null and consider it invalid
  if (format.required && (value === undefined || value === null)) {
    parent[key] = null
    console.log(chalk.yellow(`Field ${key} is required but missing`))
    isValid = false
  } else if (!format.required && value === undefined) {
    // If not required and undefined, set to null
    parent[key] = null
  }

  // Handle nullable scenario
  if (!format.required && value === null) {
    return true
  }

  if (value === 'null' || value === 'unclear' || value === 'unknown') {
    parent[key] = null
  }

  switch (format.type) {

    case 'array':
      // If the value is an object for some reason, convert to an array of 1 object
      if (typeof value === 'object' && !Array.isArray(value)) {
        parent[key] = [value]
        value = parent[key]
      }
      if (!Array.isArray(value)) {
        console.log(chalk.yellow(`Field ${key} should be an array but is not - ${value}`))
        isValid = false
      }
      if (format.elementType) {
        value.forEach((element: any, index: number) => {
          if (!checkTypeAndFix(value, index, format.elementType!)) {
            isValid = false
          }
        })
      }
      break
    
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        console.log(chalk.yellow(`Field ${key} should be an object but is not - ${value}`))
        isValid = false
      } else {
        // Check fields if object
        Object.keys(format.fields || {}).forEach((fieldKey) => {
          if (!checkTypeAndFix(value, fieldKey, format.fields![fieldKey])) {
            isValid = false
          }
        })
      }
      break

    case 'string':
      if (typeof value !== 'string') {
        if (!isNaN(value)) { // Attempt to correct number-like strings to actual numbers
          parent[key] = String(value)
        } else if (typeof value === 'object') {
          // TODO: Make this object more readable by extracting the values and joining then with a \n
          parent[key] = JSON.stringify(value)
        } else {
          console.log(chalk.yellow(`Field ${key} should be a string but is not - ${value}`))
          isValid = false
        }
      }
      if (format.possibleValues && format.possibleValues.length > 0 && !format.possibleValues.includes(value)) {
        console.log(chalk.yellow(`Field ${key} should be one of ${format.possibleValues.join(', ')} but is not - ${value}`))
        isValid = false
      }
      break

    case 'number':
      if (typeof value !== 'number') {
        const num = parseFloat(value)
        if (!isNaN(num) && isFinite(value)) {
          parent[key] = num
        } else {
          console.log(chalk.yellow(`Field ${key} should be a number but is not - ${value}`))
          isValid = false
        }
      }
      break

    case 'boolean':
      if (typeof value !== 'boolean') {
        if (value === 'true') {
          parent[key] = true
        } else if (value === 'false') {
          parent[key] = false
        } else {
          console.log(chalk.yellow(`Field ${key} should be a boolean but is not - ${value}`))
          isValid = false
        }
      }
      break

    default:
      isValid = false
      break

  }

  return isValid

}
