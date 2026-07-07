import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@/services/search.service';
import { useDebounce } from './useDebounce';

export function useGlobalSearch(query: string) {
  const debounced = useDebounce(query, 300);
  return useQuery({
    queryKey: ['search', debounced],
    queryFn: () => searchApi.search(debounced),
    enabled: debounced.trim().length > 0,
  });
}
