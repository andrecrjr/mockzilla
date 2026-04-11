import type { DocsThemeConfig } from 'nextra-theme-docs';

const config: DocsThemeConfig = {
  logo: <b>Mockzilla</b>,
  project: {
    link: 'https://github.com/andrecrjr/mockzilla',
  },
  docsRepositoryBase: 'https://github.com/andrecrjr/mockzilla',
  footer: {
    text: `MIT ${new Date().getFullYear()} © Mockzilla.`,
  },
};

export default config;
