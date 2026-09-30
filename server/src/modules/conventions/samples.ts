import { lstat, readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { CONFIG_SAMPLE_PATHS, MAX_FILE_BYTES, SOURCE_SAMPLE_COUNT } from './constants.js';
import { truncateForPrompt, type SampledFile } from './domain.js';

export interface ScannableRepo {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  clonePath: string | null;
}

export interface ConventionsSampleSet {
  configFiles: SampledFile[];
  sourceFiles: SampledFile[];
  sourceSha: string;
  indexed: boolean;
}

export interface SampleProvider {
  sample(repo: ScannableRepo): Promise<ConventionsSampleSet>;
}

export interface RankedFileSource {
  getConventionSamples(repoId: string, n: number): Promise<string[]>;
}

export interface HeadResolver {
  currentHead(repo: { owner: string; name: string }): Promise<string>;
}

export class CloneSampleProvider implements SampleProvider {
  constructor(
    private deps: { repoIntel: RankedFileSource; git: HeadResolver },
  ) {}

  async sample(repo: ScannableRepo): Promise<ConventionsSampleSet> {
    const clonePath = repo.clonePath;
    if (!clonePath) {
      throw new Error('CLONE_MISSING');
    }

    const configFiles = await this.readAll(clonePath, [...CONFIG_SAMPLE_PATHS]);
    const rankedPaths = await this.deps.repoIntel.getConventionSamples(
      repo.id,
      SOURCE_SAMPLE_COUNT,
    );
    const sourceFiles = await this.readAll(clonePath, rankedPaths);
    const sourceSha = await this.deps.git.currentHead({
      owner: repo.owner,
      name: repo.name,
    });

    return { configFiles, sourceFiles, sourceSha, indexed: rankedPaths.length > 0 };
  }

  private async readAll(clonePath: string, paths: string[]): Promise<SampledFile[]> {
    const root = resolve(clonePath);
    const read = await Promise.all(
      paths.map(async (path) => {
        const full = resolve(root, path);
        if (full !== root && !full.startsWith(root + sep)) return null;

        const stats = await lstat(full).catch(() => null);
        if (!stats || !stats.isFile() || stats.size > MAX_FILE_BYTES) return null;

        const content = await readFile(full, 'utf8').catch(() => null);
        return content === null ? null : truncateForPrompt(path, content);
      }),
    );
    return read.filter((f): f is SampledFile => f !== null);
  }
}
