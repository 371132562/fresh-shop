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
        path: '/dashboard',
        lazy: () => import('./pages/Dashboard')
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
        path: '/product',
        lazy: () => import('./pages/Product')
      },
      {
        path: '/group-buy',
        lazy: () => import('./pages/GroupBuy')
      },
      {
        path: '/order',
        lazy: () => import('./pages/Order')
      }
    ]
  }
])

export default router
