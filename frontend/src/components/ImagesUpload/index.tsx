import { PlusOutlined } from '@ant-design/icons'
import { type GetProp, Image, Upload, type UploadFile, type UploadProps } from 'antd'
import { useState } from 'react'

type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0]
type params = {
  id: string
  fileList: UploadFile[]
  setFileList: (fileList: UploadFile[]) => void
}

import { ErrorCode } from 'fresh-shop-common/types/response.ts'

import { deleteImage } from '@/services/common.ts'

const ImagesUpload = (props: params) => {
  const { fileList, setFileList, id } = props
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState('')

  const getBase64 = (file: FileType): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })

  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as FileType)
    }

    setPreviewImage(file.url || (file.preview as string))
    setPreviewOpen(true)
  }

  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList)
  }

  const handleRemove = async file => {
    let filename
    if (file.filename) {
      filename = file.filename
    } else {
      filename = file.response.data.filename
    }
    const res = await deleteImage({ id, filename })
    if (res.code === ErrorCode.SUCCESS) {
      return true
    } else {
      return false
    }
  }

  const uploadButton = (
    <button
      style={{ border: 0, background: 'none' }}
      type="button"
    >
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>上传图片</div>
    </button>
  )

  return (
    <>
      <Upload
        action="/fresh/upload"
        accept="image/*"
        multiple={true}
        listType="picture-circle"
        fileList={fileList}
        onPreview={handlePreview}
        onChange={handleChange}
        onRemove={handleRemove}
      >
        {fileList.length >= 9 ? null : uploadButton}
      </Upload>
      {previewImage && (
        <Image
          wrapperStyle={{ display: 'none' }}
          preview={{
            visible: previewOpen,
            onVisibleChange: visible => setPreviewOpen(visible),
            afterOpenChange: visible => !visible && setPreviewImage('')
          }}
          src={previewImage}
        />
      )}
    </>
  )
}
export default ImagesUpload
