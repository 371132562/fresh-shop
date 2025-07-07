import { createBrowserRouter, Navigate } from 'react-router'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/supplier" />
  },
  {
    lazy: () => import('./components/Layout'),
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
        path: '/supplier/detail/:id',
        lazy: () => import('./pages/Supplier/Detail.tsx')
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
