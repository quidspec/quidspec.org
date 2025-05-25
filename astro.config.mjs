// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
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
          label: 'Guides',
          items: [
            // Each item here is one entry in the navigation menu.
            { label: 'Example Guide', slug: 'guides/example' },
          ],
        },
        {
          label: 'Specification',
          autogenerate: { directory: 'reference' },
        },
      ],
    }),
  ],
});
