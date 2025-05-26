// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://quidspec.org',
  integrations: [
    starlight({
      title: 'QUID',
      logo: {
        src: './src/assets/quidlogo.svg',
        replacesTitle: true
      },
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/quidspec/quidspec.org' }],
      sidebar: [
        {
          label: 'Specification',
          autogenerate: { directory: 'spec' },
        },
        {
          label: 'Explainers',
          autogenerate: { directory: 'explainers' },
        },
        {
          label: 'Implementations',
          items: [
            // Each item here is one entry in the navigation menu.
            { label: 'quid.lua', slug: 'implementations/lua' },
          ],
        },
        {
          label: 'Using QUID',
          items: [
            // Each item here is one entry in the navigation menu.
            { label: 'quid.lua', slug: 'using/lua' },
          ],
        },
      ],
    }),
  ],
});
