import { Button, Result } from 'antd'
import { useNavigate } from 'react-router'

const Error = () => {
  const navigate = useNavigate()

  return (
    <Result
      status="500"
      title="抱歉，页面出现了一些问题"
      extra={
        <Button
          type="primary"
          onClick={() => navigate(-1)}
        >
          回到上一页
        </Button>
      }
    />
  )
}

export default Error
