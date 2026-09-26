"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import type {
  ConventionCandidate,
  ConventionSkillProposal,
  ConventionStatus,
  ConventionsList,
  Skill,
  SkillType,
} from "@devdigest/shared";

export const conventionsKey = (repoId: string | null | undefined) =>
  ["conventions", repoId] as const;

export function useConventions(repoId: string | null | undefined) {
  return useQuery({
    queryKey: conventionsKey(repoId),
    queryFn: () => api.get<ConventionsList>(`/repos/${repoId}/conventions`),
    enabled: !!repoId,
  });
}

export function useExtractConventions(repoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<ConventionsList>(`/repos/${repoId}/conventions/extract`),
    onSuccess: (data) => qc.setQueryData(conventionsKey(repoId), data),
  });
}

export interface UpdateConventionInput {
  id: string;
  status?: ConventionStatus;
  rule?: string;
}

export function useUpdateConvention(repoId: string) {
  const qc = useQueryClient();
  const key = conventionsKey(repoId);

  return useMutation({
    mutationFn: ({ id, ...patch }: UpdateConventionInput) =>
      api.patch<ConventionCandidate>(`/repos/${repoId}/conventions/${id}`, patch),

    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ConventionsList>(key);
      if (previous) {
        qc.setQueryData<ConventionsList>(key, {
          ...previous,
          candidates: previous.candidates.map((c) =>
            c.id === id ? { ...c, ...patch } : c
          ),
        });
      }
      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
    },

    onSuccess: (updated) => {
      qc.setQueryData<ConventionsList>(key, (current) =>
        current
          ? {
              ...current,
              candidates: current.candidates.map((c) =>
                c.id === updated.id ? updated : c
              ),
            }
          : current
      );
    },
  });
}

export interface SkillProposalInput {
  conventionIds: string[];
  name?: string;
}

export function useSkillProposal(repoId: string) {
  return useMutation({
    mutationFn: ({ conventionIds, name }: SkillProposalInput) =>
      api.post<ConventionSkillProposal>(`/repos/${repoId}/conventions/skill/proposal`, {
        convention_ids: conventionIds,
        ...(name ? { name } : {}),
      }),
  });
}

export interface CreateSkillFromConventionsInput {
  conventionIds: string[];
  name: string;
  description: string;
  type: SkillType;
  enabled: boolean;
  body: string;
}

export function useCreateSkillFromConventions(repoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSkillFromConventionsInput) =>
      api.post<Skill>(`/repos/${repoId}/conventions/skill`, {
        convention_ids: input.conventionIds,
        name: input.name,
        description: input.description,
        type: input.type,
        enabled: input.enabled,
        body: input.body,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills"] });
      qc.invalidateQueries({ queryKey: conventionsKey(repoId) });
    },
  });
}
