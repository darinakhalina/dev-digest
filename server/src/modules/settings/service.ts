import type { Settings } from '@devdigest/shared';
import type { Container } from '../../platform/container.js';
import { SettingsRepository } from './repository.js';
import { rowsToSettings } from './helpers.js';

export class SettingsService {
  private repo: SettingsRepository;

  constructor(container: Container) {
    this.repo = new SettingsRepository(container.db);
  }

  async get(workspaceId: string): Promise<Settings> {
    return rowsToSettings(await this.repo.list(workspaceId));
  }

  async update(workspaceId: string, userId: string, body: Record<string, unknown>): Promise<Settings> {
    await this.repo.upsert(workspaceId, userId, Object.entries(body));
    return this.get(workspaceId);
  }
}
