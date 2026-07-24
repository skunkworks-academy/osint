const config = {
  title: 'OSINT Investigation Methodology',
  tagline: 'Methodology first. Legal by design. Evidence-ready.',
  favicon: 'img/favicon.svg',
  url: 'https://osint.skunkworksacademy.com',
  baseUrl: '/',
  trailingSlash: true,
  organizationName: 'skunkworks-academy',
  projectName: 'osint',
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  future: {
    v4: {
      removeLegacyPostBuildHeadAttribute: true,
    },
    faster: true,
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  presets: [
    [
      'classic',
      {
        // Lesson bodies are deliberately excluded from the public GitHub Pages build.
        // Authenticated course delivery must occur through the Academy learning platform.
        docs: false,
        blog: false,
        theme: {
          customCss: [
            require.resolve('./src/css/custom.css'),
            require.resolve('./src/css/mobile.css'),
          ],
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.7,
        },
      },
    ],
  ],
  themeConfig: {
    metadata: [
      {
        name: 'description',
        content:
          'Explore OSINT-101 and enrol through Skunkworks Academy. Course lessons require an Academy account and active enrolment.',
      },
      {name: 'theme-color', content: '#071018'},
      {name: 'robots', content: 'index,follow,max-image-preview:large'},
    ],
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'OSINT | SKUNKWORKS',
      logo: {
        alt: 'Skunkworks Academy OSINT',
        src: 'img/logo.svg',
      },
      items: [
        {to: '/', label: 'Overview', position: 'left'},
        {to: '/#outcomes', label: 'Outcomes', position: 'left'},
        {to: '/#curriculum', label: 'Curriculum', position: 'left'},
        {to: '/dashboard', label: 'Dashboard', position: 'left'},
        {
          to: '/login',
          label: 'Sign in',
          position: 'right',
        },
        {
          to: '/enrol',
          label: 'Enrol now',
          position: 'right',
          className: 'navbar-enrol',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'OSINT-101',
          items: [
            {label: 'Course overview', to: '/'},
            {label: 'Enrol', to: '/enrol'},
            {label: 'Learner sign-in', to: '/login'},
          ],
        },
        {
          title: 'Skunkworks Academy',
          items: [
            {label: 'Academy website', href: 'https://www.skunkworksacademy.com/'},
            {label: 'Learner portal', href: 'https://portal.skunkworksacademy.com/'},
            {label: 'Training support', href: 'mailto:training@skunkworks.africa'},
          ],
        },
        {
          title: 'Course governance',
          items: [
            {label: 'Public-source boundaries', to: '/#guardrails'},
            {label: 'Access requirements', to: '/#access'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Skunkworks Academy. Dream. Design. Deliver.`,
    },
    prism: {
      additionalLanguages: ['json', 'bash'],
    },
  },
};

module.exports = config;
