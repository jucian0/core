import { moduleFederationPlugin } from '@module-federation/sdk';
import type { ModuleFederationPlugin as WebpackModuleFederationPlugin } from '@module-federation/enhanced';
import type { ModuleFederationPlugin as RspackModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import type { init } from '@module-federation/enhanced/runtime';

export interface PluginOptions {
  config?: moduleFederationPlugin.ModuleFederationPluginOptions;
  configPath?: string;
  remoteIpStrategy?: 'ipv4' | 'inherit';
  dataLoader?:
    | false
    | Pick<DataLoaderOptions, 'baseName' | 'partialSSRRemotes'>;
}

export interface InternalModernPluginOptions {
  csrConfig?: moduleFederationPlugin.ModuleFederationPluginOptions;
  ssrConfig?: moduleFederationPlugin.ModuleFederationPluginOptions;
  distOutputDir: string;
  originPluginOptions: PluginOptions;
  browserPlugin?: BundlerPlugin;
  nodePlugin?: BundlerPlugin;
  remoteIpStrategy?: 'ipv4' | 'inherit';
}
export type BundlerPlugin =
  | WebpackModuleFederationPlugin
  | RspackModuleFederationPlugin;

export type DataLoaderOptions = {
  baseName: string;
  partialSSRRemotes?: string[];
  metaName?: string;
  serverPlugin?: string;
  runtimeOptions?: Parameters<typeof init>[0];
  fetchSSRByRouteIds?: (
    partialSSRRemotes: string[],
    mfConfig: moduleFederationPlugin.ModuleFederationPluginOptions,
  ) => Promise<string[] | undefined>;
  patchMFConfig?: (options: {
    mfConfig: moduleFederationPlugin.ModuleFederationPluginOptions;
    baseName: string;
    metaName: string;
    isServer: boolean;
    routesFilePath: string;
  }) => void;
};
