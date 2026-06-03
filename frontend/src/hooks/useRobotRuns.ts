import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { robotRunsApi } from '../api/robotRuns';
import { RobotRun } from '../types';

export const useRobotRuns = (page: number, size: number, hasRunning: boolean) => {
  return useQuery({
    queryKey: ['robotRuns', page, size],
    queryFn: () => robotRunsApi.getAll(page, size),
    refetchInterval: hasRunning ? 10000 : false,
    placeholderData: (prev) => prev,
  });
};

export const useLatestRobotRun = () => {
  return useQuery({
    queryKey: ['robotRuns', 'latest'],
    queryFn: () => robotRunsApi.getLatest(),
    refetchInterval: 10000,
  });
};

export const useRobotRunById = (id: number | null) => {
  return useQuery({
    queryKey: ['robotRun', id],
    queryFn: () => robotRunsApi.getById(id!),
    enabled: id !== null,
  });
};
