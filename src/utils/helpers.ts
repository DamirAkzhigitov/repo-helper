import crypto from 'crypto'

export function hasCommonElement(arr1: any[], arr2: any[]) {
  return arr1.some((item) => arr2.includes(item))
}

export const sha1 = (str: string) =>
  crypto.createHash('sha1').update(str).digest('hex')

export const toSnakeCase = (str: string) => str.replace(/\s/g, '').toLowerCase()
