import { ResponseBody } from 'fresh-shop-backend/types/response.ts'

import http from './base.ts'

export const deleteImage = (data: { id: string; filename: string }): Promise<ResponseBody> =>
  http.post('/supplier/deleteImage', data)
