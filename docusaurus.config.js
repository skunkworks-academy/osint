const config = {
  title: 'OSINT Investigation Methodology',
  tagline: 'Methodology first. Legal by design. Evidence-ready.',
  favicon: 'img/favicon.svg',
  url: 'https://osint.skunkworksacademy.com',
  baseUrl: '/',
  organizationName: 'skunkworks-academy',
  projectName: 'osint',
  onBrokenLinks: 'throw',
  markdown: {hooks: {onBrokenMarkdownLinks: 'throw'}},
  i18n: {defaultLocale: 'en', locales: ['en']},
  presets: [['classic', {
    docs: {sidebarPath: require.resolve('./sidebars.js'), routeBasePath: 'course'},
    blog: false,
    theme: {customCss: require.resolve('./src/css/custom.css')},
    sitemap: {changefreq: 'weekly', priority: 0.7}
  }]],
  themeConfig: {
    metadata: [
      {name: 'description', content: 'A self-paced OSINT investigation methodology course from Skunkworks Academy.'},
      {name: 'theme-color', content: '#070b0f'}
    ],
    navbar: {
      title: 'OSINT | SKUNKWORKS',
      logo: {alt: 'Skunkworks Academy OSINT', src: 'img/logo.svg'},
      items: [
        {to: '/course/welcome', label: 'Course', position: 'left'},
        {to: '/dashboard', label: 'Dashboard', position: 'left'},
        {to: '/resources', label: 'Resources', position: 'left'},
        {to: '/login', label: 'Sign in', position: 'right'},
        {href: 'https://www.skunkworksacademy.com', label: 'Academy', position: 'right'}
      ]
    },
    footer: {
      style: 'dark',
      links: [{title: 'Course', items: [
        {label: 'Start learning', to: '/course/welcome'},
        {label: 'Learner dashboard', to: '/dashboard'},
        {label: 'Legal and ethical guardrails', to: '/course/guardrails'}
      ]}],
      copyright: `Copyright © ${new Date().getFullYear()} Skunkworks Academy. Public sources only.`
    },
    prism: {additionalLanguages: ['json', 'bash']}
  }
};
module.exports = config;
