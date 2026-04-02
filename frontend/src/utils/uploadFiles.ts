import type { ManagedUploadFile } from '@/components/ImagesUpload'

export const createManagedUploadFile = (filename: string, url: string): ManagedUploadFile => ({
  uid: filename,
  name: filename,
  status: 'done',
  url,
  filename
})
