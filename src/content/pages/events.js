module.exports = {
  template: 'events',
  locales: {
    en: {
      output: 'pages/events.html',
      lang: 'en',
      title: 'Events • Museum of AI',
      assetsPrefix: '..',
      indexHref: '../index.html',
      backLinkText: '&larr; Back to Home',
      heading: 'Events',
      intro: 'Upcoming and past events at the Museum of Artificial Intelligence.',
      bodyText: 'Content coming soon.',
      headExtras: `  <link rel="alternate" hreflang="en" href="../pages/events">\n  <link rel="alternate" hreflang="sv" href="../sv/pages/events">`
    },
    sv: {
      output: 'sv/pages/events.html',
      lang: 'sv',
      title: 'Evenemang • Museum of AI',
      assetsPrefix: '../..',
      indexHref: '../index.html',
      backLinkText: '&larr; Till startsidan',
      heading: 'Evenemang',
      intro: 'Kommande och tidigare evenemang.',
      bodyText: 'Innehåll kommer snart.',
      headExtras: `  <link rel="alternate" hreflang="sv" href="./events">\n  <link rel="alternate" hreflang="en" href="../../pages/events">`
    }
  }
};
