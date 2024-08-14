import type { ServerPlugin } from '@modern-js/server-core';
import { getInstance, init } from '@module-federation/enhanced/runtime';
import { InternalModernPluginOptions } from '../../types';
import { MF_SLIM_ROUTES } from '../../runtime/constant';

export default (options: InternalModernPluginOptions): ServerPlugin => ({
  name: 'MFDataLoaderServerPlugin',
  pre: ['@modern-js/plugin-inject-resource'],
  setup(api) {
    const mfConfig = options.csrConfig!;
    const remotes = mfConfig.remotes;
    if (!remotes || !Object.keys(remotes).length) {
      return {};
    }
    const runtimeRemotes = Object.entries(remotes).map((item) => {
      const [_alias, nameAndEntry] = item;
      const [name, entry] = (nameAndEntry as string).split('@');
      return {
        name,
        entry,
      };
    });
    let isHandled = false;

    return {
      prepare() {
        const { middlewares } = api.useAppContext();
        middlewares.push({
          name: 'MFDataLoaderServerPlugin',
          handler: async (c, next) => {
            console.log('isHandled : ', isHandled);
            const serverManifest = c.get('serverManifest');
            const { loaderBundles } = serverManifest;
            console.log(
              'loaderBundles.main.routes : ',
              loaderBundles.main.routes,
            );
            if (isHandled) {
              await next();
            } else {
              const instance =
                getInstance() ||
                init({
                  name: mfConfig.name!,
                  remotes: runtimeRemotes,
                });
              const slimRoutes = await Promise.all(
                runtimeRemotes.map(async (remote) => {
                  const { routes, baseName } = (await instance.loadRemote(
                    `${remote.name}/${MF_SLIM_ROUTES}`,
                  )) as { baseName: string; routes: any };
                  return { routes, baseName };
                }),
              );
              slimRoutes.forEach((slimRoute) => {
                const { routes, baseName } = slimRoute;
                //TODO: 后续从消费者路由获取
                routes[0].path = `/${baseName}`;
                loaderBundles.main.routes.push(...routes);
              });

              console.log(
                'loaderBundles.main.routes : ',
                loaderBundles.main.routes,
              );
              isHandled = true;
              await next();
            }
          },
          before: ['render'],
        });
      },
    };
  },
});
