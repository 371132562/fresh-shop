import { ToolOutlined } from '@ant-design/icons'
import { Button, List, Modal, Typography } from 'antd'
import { FC, useEffect } from 'react'

import useMigrationStore from '@/stores/migrationStore'

const MigrationButton: FC = () => {
  const { deduplicateImages, deduplicateImagesLoading, deduplicateImagesResult, clearResult } =
    useMigrationStore()

  useEffect(() => {
    if (deduplicateImagesResult) {
      Modal.success({
        title: '图片去重分析完成',
        width: 600,
        content: (
          <div className="mt-4">
            <p>{deduplicateImagesResult.message}</p>
            <ul className="my-2 list-disc pl-5">
              <li>
                总共扫描文件数：
                <span className="font-semibold">{deduplicateImagesResult.totalFilesScanned}</span>
              </li>
              <li>
                唯一图片数：
                <span className="font-semibold">{deduplicateImagesResult.uniqueImageCount}</span>
              </li>
              <li>
                已删除重复文件数：
                <span className="font-semibold">{deduplicateImagesResult.duplicateFilesFound}</span>
              </li>
            </ul>
            <div className="mt-4 h-64 overflow-y-auto rounded border bg-gray-50 p-2">
              <p className="font-semibold">受影响的供货商：</p>
              <List
                dataSource={deduplicateImagesResult.affectedSuppliers}
                renderItem={item => (
                  <List.Item>
                    <Typography.Text>
                      ID: {item.id} - 名称: {item.name}
                    </Typography.Text>
                  </List.Item>
                )}
                size="small"
                locale={{ emptyText: '无' }}
              />
              <p className="mt-4 font-semibold">受影响的团购单：</p>
              <List
                dataSource={deduplicateImagesResult.affectedGroupBuys}
                renderItem={item => (
                  <List.Item>
                    <Typography.Text>
                      ID: {item.id} - 名称: {item.name} (
                      {new Date(item.groupBuyStartDate).toLocaleDateString()})
                    </Typography.Text>
                  </List.Item>
                )}
                size="small"
                locale={{ emptyText: '无' }}
              />
            </div>
          </div>
        ),
        onOk: () => clearResult()
      })
    }
  }, [deduplicateImagesResult, clearResult])

  return (
    <Button
      icon={<ToolOutlined />}
      loading={deduplicateImagesLoading}
      onClick={() => deduplicateImages()}
    >
      开始分析
    </Button>
  )
}

export default MigrationButton
