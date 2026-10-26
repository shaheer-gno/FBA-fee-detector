import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { historyKeys } from '../history/queries';
import * as productsApi from './api';
import type { CreateProductPayload, Product } from './types';

export const productsKeys = {
  all: ['products'] as const,
  list: (page: number, pageSize: number, verdict?: string) =>
    [...productsKeys.all, 'list', page, pageSize, verdict ?? null] as const,
  filterOptions: () => [...productsKeys.all, 'filter-options'] as const,
};

export function useProductsList(
  page: number,
  pageSize: number,
  verdict?: string,
) {
  return useQuery({
    queryKey: productsKeys.list(page, pageSize, verdict),
    queryFn: () => productsApi.listProducts(page, pageSize, verdict),
  });
}

/** Compact list for dropdowns (history filter). */
export function useProductFilterOptions() {
  return useQuery({
    queryKey: productsKeys.filterOptions(),
    queryFn: () => productsApi.listProducts(1, 100),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      values: CreateProductPayload;
      feeDate: string;
    }) => {
      const product = await productsApi.createProduct(args.values);
      if (args.values.lastChargedFeeUsd != null) {
        const result = await productsApi.detectProduct(product.id, {
          chargedFeeUsd: args.values.lastChargedFeeUsd,
          feeDate: args.feeDate,
        });
        return { product, result };
      }
      return { product, result: null };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productsKeys.all });
      void queryClient.invalidateQueries({ queryKey: historyKeys.all });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      values: CreateProductPayload;
      feeDate: string;
    }) => {
      const product = await productsApi.updateProduct(args.id, args.values);
      if (args.values.lastChargedFeeUsd != null) {
        const result = await productsApi.detectProduct(product.id, {
          chargedFeeUsd: args.values.lastChargedFeeUsd,
          feeDate: args.feeDate,
        });
        return { product, result };
      }
      return { product, result: null };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productsKeys.all });
      void queryClient.invalidateQueries({ queryKey: historyKeys.all });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productsApi.deleteProduct,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productsKeys.all });
    },
  });
}

export function useDetectProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { product: Product; feeDate: string }) => {
      if (args.product.lastChargedFeeUsd == null) {
        throw new Error('Set Amazon charged fee on the product first (Edit).');
      }
      return productsApi.detectProduct(args.product.id, {
        chargedFeeUsd: args.product.lastChargedFeeUsd,
        feeDate: args.feeDate,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productsKeys.all });
      void queryClient.invalidateQueries({ queryKey: historyKeys.all });
    },
  });
}

export function useRunDaily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (feeDate: string) => productsApi.runDaily({ feeDate }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productsKeys.all });
      void queryClient.invalidateQueries({ queryKey: historyKeys.all });
    },
  });
}

export function useImportFeePreview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => productsApi.importFeePreview(text),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productsKeys.all });
    },
  });
}

export function useImportAmazonReports() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      files: { name: string; text: string }[];
      feeDate: string;
    }) => productsApi.importAmazonReports(args.files, args.feeDate),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productsKeys.all });
      void queryClient.invalidateQueries({ queryKey: historyKeys.all });
    },
  });
}
