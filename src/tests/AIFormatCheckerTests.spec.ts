import { IExpectedFormat, checkAndFixAIResponse } from '../utilities/AIFormatChecker'

test('Basic fomat check', () => {

  const objectToCheck = {
    stringValue: 'string',
    arrayValue: [1,2,3],
    objectValue: {
      stringValue: 'string',
      numberValue: 1,
      booleanValue: true
    }
  }

  const valid = checkAndFixAIResponse(objectToCheck, {
    type: 'object',
    required: true,
    fields: {
      stringValue: {
        type: 'string',
        required: true
      },
      arrayValue: {
        type: 'array',
        required: true,
        elementType: {
          type: 'number',
          required: true
        }
      },
      objectValue: {
        type: 'object',
        required: true,
        fields: {
          stringValue: {
            type: 'string',
            required: true
          },
          numberValue: {
            type: 'number',
            required: true
          },
          booleanValue: {
            type: 'boolean',
            required: true
          }
        }
      }
    }
  })

  expect(valid).toBe(true)

  const notValid = checkAndFixAIResponse(objectToCheck, {
    type: 'object',
    required: true,
    fields: {
      stringValue: {
        type: 'string',
        required: true
      },
      arrayValue: {
        type: 'array',
        required: true
      },
      objectValue: {
        type: 'array',
        required: true,
        elementType: {
          type: 'number',
          required: true
        }
      }
    }
  })

  expect(notValid).toBe(false)

})

test('Should fix fixable fields', () => {

  const objectToFix = {
    stringValue: 1234,
    arrayValue: [1,2,3],
    objectValue:{
      stringValue: 'string',
      numberValue: '12',
      nullValue: 'unknown'
    }
  }

  const valid = checkAndFixAIResponse(objectToFix, {
    type: 'object',
    required: true,
    fields: {
      stringValue: {
        type: 'string',
        required: true
      },
      arrayValue: {
        type: 'array',
        required: true
      },
      objectValue: {
        type: 'object',
        required: true,
        fields: {
          stringValue: {
            type: 'string',
            required: true
          },
          numberValue: {
            type: 'number',
            required: true
          },
          nullValue: {
            type: 'string',
            required: true
          }
        }
      }
    }
  })

  expect(valid).toBe(true)
  expect(objectToFix.stringValue).toBe('1234')
  expect(objectToFix.objectValue.numberValue).toBe(12)
  expect(objectToFix.objectValue.nullValue).toBe(null)

})

test('Test expeted values', () => {

  const validObject = {
    status: 'approved'
  }

  const invalidObject = {
    status: 'something else'
  }

  const format: IExpectedFormat = {
    type: 'object',
    required: true,
    fields: {
      status: {
        type: 'string',
        required: true,
        possibleValues: ['approved', 'denied', 'pending']
      }
    }
  }

  const valid = checkAndFixAIResponse(validObject, format)

  expect(valid).toBe(true)

  const invalid = checkAndFixAIResponse(invalidObject, format)

  expect(invalid).toBe(false)

})

test('Test array values', () => {
  
  const validObject = {
    list: [1, 2, 3]
  }

  const invalidObject = {
    list: ['test', 'eh?']
  }

  const format: IExpectedFormat = {
    type: 'object',
    required: true,
    fields: {
      list: {
        type: 'array',
        required: true,
        elementType: {
          type: 'number',
          required: true
        }
      }
    }
  }

  const valid = checkAndFixAIResponse(validObject, format)

  expect(valid).toBe(true)

  const invalid = checkAndFixAIResponse(invalidObject, format)

  expect(invalid).toBe(false)

})

test('Can correct expected array but gets a single object', () => {

  const objectToFix = {
    shouldBeArray: {
      stringValue: 'string',
      numberValue: 1
    }
  }

  const format: IExpectedFormat = {
    type: 'object',
    required: true,
    fields: {
      shouldBeArray: {
        type: 'array',
        required: true,
        elementType: {
          type: 'object',
          required: true,
          fields: {
            stringValue: {
              type: 'string',
              required: true
            },
            numberValue: {
              type: 'number',
              required: true
            }
          }
        }
      }
    }
  }

  const valid = checkAndFixAIResponse(objectToFix, format)

  expect(valid).toBe(true)
  expect(objectToFix.shouldBeArray).toBeInstanceOf(Array)

})

test('Can correct an array of objects that should be an array of strings', () => {

  const objectToFix = {
    shouldBeArray: [
      {
        stringValue: 'string',
        numberValue: 1
      },
      {
        stringValue: 'another string',
        numberValue: 2
      }
    ]
  }

  const format: IExpectedFormat = {
    type: 'object',
    required: true,
    fields: {
      shouldBeArray: {
        type: 'array',
        required: true,
        elementType: {
          type: 'string',
          required: true
        }
      }
    }
  }

  const valid = checkAndFixAIResponse(objectToFix, format)
  
  expect(valid).toBe(true)
  expect(objectToFix.shouldBeArray).toBeInstanceOf(Array)
  for (const element of objectToFix.shouldBeArray) {
    expect(typeof element).toBe('string')
  }

})
