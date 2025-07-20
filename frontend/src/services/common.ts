import { ResponseBody } from 'fresh-shop-backend/types/response.ts'

import http from './base.ts'

export type DeleteImageType = 'supplier' | 'groupBuy'

const deleteImageApi = '/upload/delete'

export const deleteImage = (data: {
  id: string
  filename: string
  type: DeleteImageType
}): Promise<ResponseBody> => http.post(deleteImageApi, data)
