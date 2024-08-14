import path from 'path';
import { fs } from '@modern-js/utils';
import type { CliPlugin, AppTools } from '@modern-js/app-tools';
import type { DataLoaderOptions, InternalModernPluginOptions } from '../types';
import type { init } from '@module-federation/enhanced/runtime';
import { transformName2Prefix } from '../runtime/utils';
import { PLUGIN_IDENTIFIER } from '../constant';
import {
  MF_FULL_ROUTES,
  MF_SLIM_ROUTES,
  MF_ROUTES_META,
} from '../runtime/constant';
import { generateRoutes, generateSlimRoutes } from './ast';
import { MODERN_JS_FILE_SYSTEM_ROUTES_FILE_NAME, META_NAME } from './constant';
import type { moduleFederationPlugin } from '@module-federation/sdk';

function generateExtraExposeFiles(
  options: Parameters<Required<DataLoaderOptions>['patchMFConfig']>[0],
) {
  const { routesFilePath, mfConfig, isServer, baseName } = options;
  const outputDir = path.resolve(process.cwd(), 'node_modules/.federation');
  fs.ensureDirSync(outputDir);
  const addSuffix = (fileName: string) => {
    if (!isServer) {
      return `${fileName}.jsx`;
    }
    return `${fileName}.server.jsx`;
  };
  const routesFileContent = fs.readFileSync(routesFilePath, 'utf-8');

  const outputSlimRoutesPath = path.resolve(
    outputDir,
    addSuffix(MF_SLIM_ROUTES),
  );
  const outputFullRoutesPath = path.resolve(
    outputDir,
    addSuffix(MF_FULL_ROUTES),
  );
  const outputRoutesMetaPath = path.resolve(outputDir, `${MF_ROUTES_META}.js`);

  generateSlimRoutes({
    sourceCode: routesFileContent,
    filePath: outputSlimRoutesPath,
    prefix: transformName2Prefix(mfConfig.name!),
    baseName,
  });
  generateRoutes({
    sourceCode: routesFileContent,
    filePath: outputFullRoutesPath,
    prefix: transformName2Prefix(mfConfig.name!),
    baseName,
  });
  fs.writeFileSync(
    outputRoutesMetaPath,
    `export const baseName = '${baseName}';`,
  );

  return {
    outputSlimRoutesPath,
    outputFullRoutesPath,
    outputRoutesMetaPath,
  };
}
function addExpose(
  options: Parameters<Required<DataLoaderOptions>['patchMFConfig']>[0],
) {
  const { mfConfig } = options;
  const { outputSlimRoutesPath, outputFullRoutesPath, outputRoutesMetaPath } =
    generateExtraExposeFiles(options);

  const fullRoutesKey = `./${MF_FULL_ROUTES}`;
  const slimRoutesKey = `./${MF_SLIM_ROUTES}`;
  const routeMetaKey = `./${MF_ROUTES_META}`;

  if (!mfConfig.exposes) {
    mfConfig.exposes = {
      [fullRoutesKey]: outputFullRoutesPath,
      [slimRoutesKey]: outputSlimRoutesPath,
      [routeMetaKey]: outputRoutesMetaPath,
    };
  } else {
    if (!Array.isArray(mfConfig.exposes)) {
      if (!mfConfig.exposes[fullRoutesKey]) {
        mfConfig.exposes[fullRoutesKey] = outputFullRoutesPath;
      }
      if (!mfConfig.exposes[slimRoutesKey]) {
        mfConfig.exposes[slimRoutesKey] = outputSlimRoutesPath;
      }
      if (!mfConfig.exposes[routeMetaKey]) {
        mfConfig.exposes[routeMetaKey] = outputRoutesMetaPath;
      }
    }
  }
}
function addShared(
  options: Parameters<Required<DataLoaderOptions>['patchMFConfig']>[0],
) {
  const { metaName, mfConfig } = options;
  const alias = `@${metaName}/runtime/router`;
  if (!mfConfig.shared) {
    mfConfig.shared = {
      [alias]: { singleton: true },
    };
  } else {
    if (!Array.isArray(mfConfig.shared)) {
      mfConfig.shared[alias] = { singleton: true };
    } else {
      mfConfig.shared.push(alias);
    }
  }
}

function _pathMfConfig(
  options: Parameters<Required<DataLoaderOptions>['patchMFConfig']>[0],
) {
  addShared(options);
  addExpose(options);
}

// async function _fetchSSRByRouteIds(
//   partialSSRRemotes: string[],
//   mfConfig: moduleFederationPlugin.ModuleFederationPluginOptions,
// ): Promise<undefined | string[]> {
//   if (!mfConfig.remotes || !Object.keys(mfConfig.remotes).length) {
//     return undefined;
//   }
//   if (!partialSSRRemotes.length) {
//     return undefined;
//   }

//   const remoteMfModernRouteJsonUrls = Object.entries(mfConfig.remotes).map(
//     (item) => {
//       const [_key, config] = item as [
//         string,
//         (
//           | moduleFederationPlugin.RemotesConfig
//           | moduleFederationPlugin.RemotesItem
//         ),
//       ];
//       const entry =
//         typeof config === 'string' ? config : (config.external as string);
//       const [_name, url] = entry.split('@');
//       const mfModernRouteJsonUrl = url.replace(
//         new URL(url.startsWith('//') ? `http:${url}` : url).pathname,
//         `/${MF_MODERN_ROUTE_JSON}`,
//       );
//       return mfModernRouteJsonUrl;
//     },
//   );

//   const remoteProviderRouteIds: Set<string> = new Set();
//   await Promise.all(
//     remoteMfModernRouteJsonUrls.map(async (url) => {
//       const rep = await fetch(url);
//       const routeJson: MFModernRouteJson =
//         (await rep.json()) as MFModernRouteJson;
//       const prefix = routeJson.prefix;
//       const collectIds = (route: Route) => {
//         remoteProviderRouteIds.add(`${prefix}${route.id}`);
//         if (route.children) {
//           route.children.forEach((r) => {
//             collectIds(r);
//           });
//         }
//       };
//       Object.values(routeJson.routes).forEach((routeArr) => {
//         routeArr.forEach((r) => collectIds(r));
//       });
//     }),
//   );
//   console.log(111, [...remoteProviderRouteIds]);
//   return [...remoteProviderRouteIds];
// }

function transformRuntimeOptions(
  buildOptions: moduleFederationPlugin.ModuleFederationPluginOptions,
): Parameters<typeof init>[0] {
  const remotes = buildOptions.remotes || {};
  const runtimeRemotes = Object.entries(remotes).map((remote) => {
    const [_alias, nameAndEntry] = remote;
    const [name, entry] = (nameAndEntry as string).split('@');
    return { name, entry };
  });

  return {
    name: buildOptions.name!,
    remotes: runtimeRemotes,
  };
}

export const moduleFederationDataLoaderPlugin = (
  enable: boolean,
  internalOptions: InternalModernPluginOptions,
  userConfig: DataLoaderOptions,
): CliPlugin<AppTools> => ({
  name: '@modern-js/plugin-module-federation-data-loader',
  pre: ['@modern-js/plugin-module-federation-config'],
  post: ['@modern-js/plugin-router', '@modern-js/plugin-module-federation'],
  setup: async ({ useConfigContext, useAppContext }) => {
    if (!enable) {
      return;
    }
    const {
      baseName,
      partialSSRRemotes = [],
      fetchSSRByRouteIds,
      patchMFConfig,
      metaName = META_NAME,
      serverPlugin = '@module-federation/modern-js/data-loader-server',
      runtimeOptions,
    } = userConfig;

    if (!baseName) {
      throw new Error(
        `${PLUGIN_IDENTIFIER} 'baseName' is required if you enable 'dataLoader'!`,
      );
    }
    const modernjsConfig = useConfigContext();
    const appContext = useAppContext();

    const enableSSR = Boolean(modernjsConfig?.server?.ssr);
    const name = internalOptions.csrConfig?.name!;
    //TODO: 区分多入口、区分 server/client routes
    const routesFilePath = path.resolve(
      appContext.internalDirectory.replace(META_NAME, metaName || META_NAME),
      `./main/${MODERN_JS_FILE_SYSTEM_ROUTES_FILE_NAME}`,
    );

    return {
      _internalRuntimePlugins: ({ entrypoint, plugins }) => {
        plugins.push({
          name: 'ssrDataLoader',
          path: '@module-federation/modern-js/data-loader',
          config: {},
        });
        return { entrypoint, plugins };
      },
      _internalServerPlugins({ plugins }) {
        plugins.push({
          name: serverPlugin,
          options:
            runtimeOptions ||
            transformRuntimeOptions(internalOptions.csrConfig!),
        });

        return { plugins };
      },
      config: async () => {
        console.log('dataloader plugin config');

        // const fetchFn = fetchSSRByRouteIds || _fetchSSRByRouteIds;
        // const ssrByRouteIds = await fetchFn(
        //   partialSSRRemotes,
        //   internalOptions.csrConfig!,
        // );
        // console.log('ssrByRouteIds: ', ssrByRouteIds);
        const patchMFConfigFn = patchMFConfig || _pathMfConfig;

        return {
          // server: {
          //   ssrByRouteIds: ssrByRouteIds,
          // },
          tools: {
            rspack(_config, { isServer }) {
              patchMFConfigFn({
                mfConfig: isServer
                  ? internalOptions.ssrConfig!
                  : internalOptions.csrConfig!,
                baseName,
                metaName,
                isServer,
                routesFilePath,
              });
              console.log('dataloader plugin rspack');
            },
          },
          source: {
            define: {
              MODERN_ROUTER_ID_PREFIX: JSON.stringify(
                transformName2Prefix(name),
              ),
            },
          },
        };
      },
    };
  },
});

export default moduleFederationDataLoaderPlugin;

export { generateRoutes, generateSlimRoutes };
