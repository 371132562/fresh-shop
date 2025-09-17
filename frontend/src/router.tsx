import { createBrowserRouter, Navigate } from 'react-router'

import ErrorPage from './components/Error'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/supplier" />,
    errorElement: <ErrorPage />
  },
  {
    lazy: () => import('./components/Layout'),
    // 将错误元素放在布局路由上，它可以捕获所有子路由的渲染错误
    errorElement: <ErrorPage />,
    children: [
      {
        path: '/analysis',
        lazy: () => import('./pages/Analysis')
      },
      {
        path: '/supplier',
        lazy: () => import('./pages/Supplier')
      },
      {
        path: '/customer',
        lazy: () => import('./pages/Customer')
      },
      {
        path: '/address',
        lazy: () => import('./pages/CustomerAddress')
      },
      {
        path: '/product',
        lazy: () => import('./pages/Product')
      },
      {
        path: '/productType',
        lazy: () => import('./pages/ProductType')
      },
      {
        path: '/groupBuy',
        lazy: () => import('./pages/GroupBuy')
      },
      {
        path: '/groupBuy/detail/:id',
        lazy: () => import('./pages/GroupBuy/Detail.tsx')
      },
      {
        path: '/order',
        lazy: () => import('./pages/Order')
      },
      {
        path: '/order/detail/:id',
        lazy: () => import('./pages/Order/Detail.tsx')
      }
    ]
  }
])

export default router
