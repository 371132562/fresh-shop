import http from './base.ts'

export const deleteImage = (data: { id: string; filename: string }) =>
  http.post('/supplier/deleteImage', data)
