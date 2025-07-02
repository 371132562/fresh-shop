// AppErrorBoundary.tsx
import { Button, Result } from 'antd'
import { ErrorBoundary } from 'react-error-boundary'
import { useRouteError } from 'react-router' // 依然需要它来获取路由错误

function ErrorFallback({ error, resetErrorBoundary }) {
  const routeError = useRouteError() // 获取路由错误

  console.error('Caught an error in ErrorFallback:', error || routeError) // 添加日志

  return (
    <Result
      status="error"
      title="出错了！"
      subTitle={routeError?.message || error?.message || '未知错误'}
      extra={
        <Button
          type="primary"
          onClick={resetErrorBoundary}
        >
          重试
        </Button>
      }
    />
  )
}

export function AppErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        console.log('Resetting error boundary, reloading page...') // 添加日志
        window.location.reload()
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
