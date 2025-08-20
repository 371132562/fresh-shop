import { ResponseBody } from 'fresh-shop-backend/types/response.ts'

import http from './base.ts'

export type DeleteImageType = 'supplier' | 'groupBuy'

const deleteImageApi = '/upload/delete'
const scanOrphanImagesApi = '/upload/scan-orphans'
const deleteOrphanImagesApi = '/upload/delete-orphans'

export const deleteImage = (data: {
  id: string
  filename: string
  type: DeleteImageType
}): Promise<ResponseBody> => http.post(deleteImageApi, data)

export type OrphanImageItem = {
  filename: string
  inDisk: boolean
  inDB: boolean
}

export const scanOrphanImages = (): Promise<ResponseBody<{ list: OrphanImageItem[] }>> =>
  http.post(scanOrphanImagesApi, {})

export const deleteOrphanImages = (data: {
  filenames: string[]
}): Promise<ResponseBody<{ deleted: string[]; skipped: string[] }>> =>
  http.post(deleteOrphanImagesApi, data)
