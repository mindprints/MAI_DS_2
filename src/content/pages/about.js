const boardMembers = {
  en: [
    {
      id: 'greg-fitzpatrick',
      linkText: 'Greg FitzPatrick (Chairman)',
      href: 'https://www.linkedin.com/in/mindprints/',
      description: ', IT consultant and multimedia artist, who has worked for the Swedish IT Commission, the National Agency for Education, the City of Stockholm, SOS Alarm, among others, and has lectured at Stockholm University in legal informatics.'
    },
    {
      id: 'patrik-faltstrom',
      linkText: 'Patrik Fältström',
      href: 'https://www.linkedin.com/in/patrikhson/',
      description: ', a leading Swedish expert in internet and network technology, and Head of Research at Netnod, which manages critical parts of Sweden\'s internet infrastructure.'
    },
    {
      id: 'peter-krantz',
      linkText: 'Peter Krantz',
      href: 'https://www.linkedin.com/in/peterkrantz/',
      description: ', currently CTO at the Swedish Payout Authority. He has previously worked on organizational development and information management in the public sector, including serving as Head of Digitization at the National Library of Sweden.'
    },
    {
      id: 'johan-jonker',
      linkText: 'Johan Jonker',
      href: 'https://www.linkedin.com/in/johan-jonker-3211405/',
      description: ', CEO and co-founder of the Swedish game development company Fatshark, best known for the critically acclaimed Warhammer titles.'
    },
    {
      id: 'per-mosseby',
      linkText: 'Per Mosseby',
      href: 'https://www.linkedin.com/in/mosseby/',
      description: ', entrepreneur with a background in both technology and the public sector. Former Director of Digitization at SKR (Swedish Association of Local Authorities and Regions).'
    },
    {
      id: 'hakan-lidbo',
      linkText: 'Håkan Lidbo',
      href: 'https://www.linkedin.com/in/hakanlidbo/',
      description: ', known for his innovative and experimental work exploring the boundaries between art, music, science, games, technology, and society.'
    }
  ],
  sv: [
    {
      id: 'greg-fitzpatrick',
      linkText: 'Greg FitzPatrick (ordförande)',
      href: 'https://www.linkedin.com/in/mindprints/',
      description: ', IT-konsult och multimediekonstnär som har arbetat för IT-kommissionen, Skolverket, Stockholms stad, SOS Alarm m.fl. och föreläst vid Stockholms universitet i rättsinformatik.'
    },
    {
      id: 'patrik-faltstrom',
      linkText: 'Patrik Fältström',
      href: 'https://www.linkedin.com/in/patrikhson/',
      description: ', en ledande svensk expert inom internet- och nätverksteknik, forskningschef på Netnod som hanterar kritiska delar av Sveriges internetinfrastruktur.'
    },
    {
      id: 'peter-krantz',
      linkText: 'Peter Krantz',
      href: 'https://www.linkedin.com/in/peterkrantz/',
      description: ', idag CTO på Utbetalningsmyndigheten. Han har tidigare arbetat med verksamhetsutveckling och informationsförvaltning i offentlig sektor, bland annat som chef för digitalisering vid Kungliga biblioteket.'
    },
    {
      id: 'johan-jonker',
      linkText: 'Johan Jonker',
      href: 'https://www.linkedin.com/in/johan-jonker-3211405/',
      description: ', vd och medgrundare av det svenska spelutvecklingsföretaget Fatshark, mest känt för de kritikerrosade Warhammer-titlarna.'
    },
    {
      id: 'per-mosseby',
      linkText: 'Per Mosseby',
      href: 'https://www.linkedin.com/in/mosseby/',
      description: ', entreprenör med bakgrund i både teknik och offentlig sektor. Tidigare chef för digitalisering på SKR (Sveriges Kommuner och Regioner).'
    },
    {
      id: 'hakan-lidbo',
      linkText: 'Håkan Lidbo',
      href: 'https://www.linkedin.com/in/hakanlidbo/',
      description: ', känd för sitt innovativa och experimentella arbete i gränslandet mellan konst, musik, vetenskap, spel, teknik och samhälle.'
    }
  ]
};

module.exports = {
  template: 'about',
  locales: {
    en: {
      output: 'pages/about.html',
      lang: 'en',
      title: "Who's behind the Museum of AI?",
      assetsPrefix: '..',
      indexHref: '../index.html',
      backLinkText: '&larr; Back to Home',
      mainHeading: "Who's behind the Museum of AI?",
      missionParagraph: 'The Museum of Artificial Intelligence, founded in 2023, is dedicated to sharing knowledge about AI with the public. We are a non-profit, non-commercial association with 60 members. Our mission is to provide a balanced perspective on AI and its impact on work, creativity, and social life. We believe people should be well-informed about AI and how it can be used, while also being mindful of the potential consequences of its widespread adoption, including possible risks and negative effects.',
      boardHeading: 'Our Board',
      boardLead: 'Prominent representatives from the arts, business, and the public sector:',
      ctaHref: 'membership.html',
      ctaText: 'Join us',
      headExtras: `  <link rel="alternate" hreflang="en" href="../pages/about">\n  <link rel="alternate" hreflang="sv" href="../sv/pages/about">\n  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>\n  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flag-icons/css/flag-icons.min.css">`
    },
    sv: {
      output: 'sv/pages/about.html',
      lang: 'sv',
      title: 'Om – Museum of AI',
      assetsPrefix: '../..',
      indexHref: '../index.html',
      backLinkText: '&larr; Till startsidan',
      mainHeading: 'Vem står bakom Museet för Artificiell Intelligens?',
      missionParagraph: 'Museum of Artificial Intelligence, grundat 2023, arbetar för att sprida kunskap om AI till allmänheten. Vi är en ideell, icke-kommersiell förening med 60 medlemmar. Vårt uppdrag är att ge ett balanserat perspektiv på AI och dess påverkan på arbete, kreativitet och samhällsliv. Vi menar att människor bör vara väl informerade om AI och hur tekniken kan användas, samtidigt som man är medveten om de möjliga konsekvenserna av ett brett införande, inklusive risker och negativa effekter.',
      boardHeading: 'Vår styrelse',
      boardLead: 'Framstående företrädare från kultur, näringsliv och offentlig sektor:',
      ctaHref: 'membership.html',
      ctaText: 'Bli medlem',
      headExtras: `  <link rel="alternate" hreflang="sv" href="./about">\n  <link rel="alternate" hreflang="en" href="../../pages/about">\n  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>\n  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flag-icons/css/flag-icons.min.css">`
    }
  },
  prepare(locale, data) {
    const list = (boardMembers[locale] || []).map((member) => {
      const relAttr = member.rel ? ` rel="${member.rel}"` : ' rel="noopener noreferrer"';
      return `            <li id="${member.id}">\n              <p class="leading-relaxed bg-slate-800/30 p-4 rounded-lg">\n                <strong><a href="${member.href}" target="_blank"${relAttr} class="hover:text-cyan-400">${member.linkText}</a></strong>${member.description}\n              </p>\n            </li>`;
    }).join('\n');

    return {
      ...data,
      boardList: list,
    };
  }
};
