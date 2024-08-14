import type { ServerPlugin } from '@modern-js/server-core';
import { getInstance, init } from '@module-federation/enhanced/runtime';
import { MF_SLIM_ROUTES } from '../../runtime/constant';

type MFRuntimeOptions = Parameters<typeof init>[0];

export default (mfRuntimeOptions: MFRuntimeOptions): ServerPlugin => ({
  name: 'MFDataLoaderServerPlugin',
  pre: ['@modern-js/plugin-inject-resource'],
  setup(api) {
    const { remotes, name } = mfRuntimeOptions;
    if (!remotes.length) {
      return {};
    }
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
                  name: name,
                  remotes,
                });
              const slimRoutes = await Promise.all(
                remotes.map(async (remote) => {
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
