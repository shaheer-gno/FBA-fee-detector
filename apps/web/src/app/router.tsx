import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { AnalyzePage } from '../modules/analyze/pages/AnalyzePage';
import { HistoryPage } from '../modules/history/pages/HistoryPage';
import { ProductsPage } from '../modules/products/pages/ProductsPage';
import { AppShell } from './AppShell';

const rootRoute = createRootRoute({
  component: AppShell,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: ProductsPage,
});

const analyzeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analyze',
  component: AnalyzePage,
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/history',
  validateSearch: (search: Record<string, unknown>): { productId?: string } => ({
    productId:
      typeof search.productId === 'string' && search.productId.length > 0
        ? search.productId
        : undefined,
  }),
  component: HistoryPage,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute, analyzeRoute, historyRoute]),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
