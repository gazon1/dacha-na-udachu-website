"use client";
import { useMutation, useQueryClient, type MutationFunction } from "@tanstack/react-query";
import toast from "react-hot-toast";

interface UseAppMutationOptions<TData, TVariables> {
  mutationFn: MutationFunction<TData, TVariables>;
  queryKeysToInvalidate: string[][];
  successMessage?: string;
  errorMessage?: string;
  onSuccessCallback?: (data: TData) => void;
}

/**
 * Универсальный хук мутации — инкапсулирует:
 * - проверку `result.error` (наш формат API-ошибки)
 * - toast.success / toast.error
 * - invalidateQueries для указанных ключей
 * - опциональный callback
 */
export function useAppMutation<TData, TVariables>({
  mutationFn,
  queryKeysToInvalidate,
  successMessage,
  errorMessage = "Ошибка сети",
  onSuccessCallback,
}: UseAppMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data: TData) => {
      // Наш API возвращает { error: string } при ошибке
      if (data && typeof data === "object" && "error" in data) {
        toast.error((data as { error: string }).error);
        return;
      }
      if (successMessage) toast.success(successMessage);
      queryKeysToInvalidate.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key })
      );
      onSuccessCallback?.(data);
    },
    onError: () => toast.error(errorMessage),
  });
}
