const PURE = '^src/modules/[^/]+/(domain|status|helpers|constants)\\.ts$';

module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'Runtime import cycles. Type-only cycles are ignored: services typing the Container create them.',
      severity: 'error',
      from: {},
      to: { circular: true, viaOnly: { dependencyTypesNot: ['type-only'] } },
    },
    {
      name: 'contracts-are-innermost',
      comment: 'src/vendor/shared (contracts and ports) imports nothing from the app.',
      severity: 'error',
      from: { path: '^src/vendor/' },
      to: { path: '^src/(modules|adapters|platform|db)/' },
    },
    {
      name: 'pure-domain',
      comment: 'Domain rules are pure: no db, drizzle, adapters, container, fastify, SDKs or Node I/O.',
      severity: 'error',
      from: { path: PURE },
      to: {
        path: [
          '^src/db/',
          '^src/adapters/',
          '^src/platform/container\\.ts$',
          '(^|/)node_modules/(fastify|@fastify|drizzle-orm|postgres|octokit|@octokit|openai|@anthropic-ai|simple-git|p-queue)/',
          '^(node:)?(fs|fs/promises|child_process|net|http|https)$',
        ],
      },
    },
    {
      name: 'core-knows-no-http',
      comment: 'Services, repositories and domain files never import fastify; HTTP is the outer edge.',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/(service|run-executor|repository|domain|status|helpers|constants|findings)' },
      to: { path: '(^|/)node_modules/(fastify|@fastify|fastify-sse-v2)/' },
    },
    {
      name: 'service-not-routes',
      comment: 'Application services never depend on the HTTP layer.',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/(service|run-executor)\\.ts$' },
      to: { path: '^src/modules/[^/]+/routes\\.ts$' },
    },
    {
      name: 'repository-not-upward',
      comment: 'A repository never imports the service or routes that use it.',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/repository(\\.ts$|/)' },
      to: { path: '^src/modules/[^/]+/(service|routes|run-executor)\\.ts$' },
    },
    {
      name: 'routes-no-db',
      comment: 'Routes call a service; queries live in the module repository.ts, never in routes.ts.',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/routes\\.ts$' },
      to: { path: ['^src/db/', '(^|/)node_modules/drizzle-orm/'] },
    },
    {
      name: 'routes-not-repository',
      comment: 'Routes never reach a repository directly; they call the service that owns the use case.',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/routes\\.ts$' },
      to: { path: '^src/modules/[^/]+/repository(\\.ts$|/)' },
    },
    {
      name: 'service-via-repository',
      comment: 'Services reach the database through a repository, not db/schema or drizzle-orm.',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/(service|run-executor|findings)\\.ts$' },
      to: { path: ['^src/db/(client|schema)', '(^|/)node_modules/drizzle-orm/'], dependencyTypesNot: ['type-only'] },
    },
    {
      name: 'no-cross-module-imports',
      comment:
        'A module imports from another only its public surface: types.ts (interfaces, reached through ' +
        'the container) and domain.ts (pure rules). _shared is common ground.',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/([^/]+)/',
        pathNot: ['^src/modules/$1/', '^src/modules/_shared/', '^src/modules/[^/]+/(types|domain)\\.ts$'],
      },
    },
    {
      name: 'adapters-know-no-modules',
      comment: 'An adapter implements a port; it never knows which feature module uses it.',
      severity: 'error',
      from: { path: '^src/adapters/' },
      to: { path: '^src/modules/' },
    },
    {
      name: 'adapters-not-container',
      comment: 'Adapters are built by the container; they never import it.',
      severity: 'error',
      from: { path: '^src/adapters/' },
      to: { path: '^src/platform/container\\.ts$' },
    },
    {
      name: 'only-container-imports-adapters',
      comment: 'Concrete adapters are imported only by platform/container.ts; everyone else uses the port.',
      severity: 'error',
      from: { path: '^src/', pathNot: ['^src/platform/container\\.ts$', '^src/adapters/'] },
      to: { path: '^src/adapters/[^/]+/', pathNot: ['^src/adapters/index\\.ts$'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['src/db/migrations'] },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.js', '.json'],
    },
  },
};
