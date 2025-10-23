const fs = require('fs');
const path = require('path');

function load(partial) {
  return fs.readFileSync(path.join(__dirname, partial), 'utf8');
}

function getDocuments() {
  const docsDir = path.join(__dirname, '../../../docs/association-docs-for-anual-meeting');
  const files = fs.readdirSync(docsDir).filter(file => file.endsWith('.pdf'));
  
  return files.map(filename => {
    // Extract meaningful information from filename
    const nameWithoutExt = filename.replace('.pdf', '');
    
    // Create document metadata based on filename patterns
    let category = 'Document';
    let title = nameWithoutExt;
    let description = 'Official document';
    
    if (filename.includes('Protokoll')) {
      category = 'Minutes';
      if (filename.includes('styrelsemöte')) {
        title = filename.includes('2025') ? 'Board Meeting Minutes August 2025' : 'Board Meeting Minutes 2023-1';
        description = filename.includes('2025') ? 'Latest board meeting protocol' : 'Meeting protocol from board session';
      } else if (filename.includes('uppstart')) {
        title = 'Museum Startup Protocol 2023';
        description = 'Establishment and founding documentation';
      }
    } else if (filename.includes('Ekonomisk')) {
      category = 'Financial';
      if (filename.includes('2024')) {
        title = 'Economic Report 2024';
        description = 'Financial documentation (signed)';
      } else {
        title = 'Financial Report 2023-2025';
        description = 'Economic review for two-year period';
      }
    } else if (filename.includes('Stadgar')) {
      category = 'Bylaws';
      title = 'Articles of Association 2023';
      description = 'Official organization bylaws and statutes';
    } else if (filename.includes('Revisionsberättelse')) {
      category = 'Audit';
      title = 'Auditor\'s Report';
      description = 'Annual audit and review statement';
    } else if (filename.includes('Verksamhetsberattelse')) {
      category = 'Report';
      title = 'Activity Report 2023-2025';
      description = 'Operations and activities overview';
    } else if (filename.includes('Verksamhetsplan')) {
      category = 'Planning';
      title = 'Operations Plan & Budget 2025-2026';
      description = 'Strategic plan and budget allocation';
    } else if (filename.includes('Dagordning')) {
      category = '2025 Agenda';
      title = 'Annual Meeting Agenda 2025';
      description = 'Meeting agenda with slideshow';
    } else if (filename.includes('Ansökan')) {
      category = 'Application';
      title = 'Organization Number Application';
      description = 'Official registration documentation';
    } else if (filename.includes('första möte')) {
      category = 'First Meeting';
      title = 'First AI Museum Meeting';
      description = 'August 11 - Meeting at Moumo';
    }
    
    return {
      filename,
      category,
      title,
      description
    };
  });
}

function generateDocumentCards(documents, assetsPrefix) {
  const categoryColors = {
    'Minutes': 'bg-blue-900 text-blue-300',
    'Financial': 'bg-green-900 text-green-300',
    'Bylaws': 'bg-slate-700 text-slate-300',
    'Audit': 'bg-orange-900 text-orange-300',
    'Report': 'bg-cyan-900 text-cyan-300',
    'Planning': 'bg-cyan-900 text-cyan-300',
    '2025 Agenda': 'bg-purple-900 text-purple-300',
    'Application': 'bg-amber-900 text-amber-300',
    'First Meeting': 'bg-indigo-900 text-indigo-300',
    'Document': 'bg-gray-900 text-gray-300'
  };
  
  return documents.map(doc => {
    const colorClass = categoryColors[doc.category] || 'bg-gray-900 text-gray-300';
    return `
        <!-- Document: ${doc.filename} -->
        <a href="${assetsPrefix}/documents/${doc.filename}" target="_blank" rel="noopener noreferrer" class="glass-card p-6 rounded-xl border border-slate-700 hover:border-cyan-400 hover:shadow-lg transition-all duration-300 flex flex-col">
          <div class="flex items-start justify-between mb-4">
            <i class="fa-solid fa-file-pdf text-red-500 text-2xl"></i>
            <span class="text-xs ${colorClass} px-2 py-1 rounded">${doc.category}</span>
          </div>
          <h3 class="text-lg font-bold mb-2 text-slate-100">${doc.title}</h3>
          <p class="text-slate-400 text-sm flex-grow mb-4">${doc.description}</p>
          <span class="text-cyan-400 text-sm font-medium">Download PDF →</span>
        </a>`;
  }).join('\n');
}

function generateInfoPointsHtml(infoPoints) {
  return infoPoints.map(point => 
    `<li class="flex items-start space-x-3">
      <i class="fa-solid fa-check text-emerald-400 mt-1"></i>
      <span>${point}</span>
    </li>`
  ).join('\n          ');
}

function generateSwedishDocumentCards(documents, assetsPrefix) {
  const categoryColors = {
    'Minutes': 'bg-blue-900 text-blue-300',
    'Financial': 'bg-green-900 text-green-300',
    'Bylaws': 'bg-slate-700 text-slate-300',
    'Audit': 'bg-orange-900 text-orange-300',
    'Report': 'bg-cyan-900 text-cyan-300',
    'Planning': 'bg-cyan-900 text-cyan-300',
    '2025 Agenda': 'bg-purple-900 text-purple-300',
    'Application': 'bg-amber-900 text-amber-300',
    'First Meeting': 'bg-indigo-900 text-indigo-300',
    'Document': 'bg-gray-900 text-gray-300'
  };
  
  // Swedish translations
  const swedishCategories = {
    'Minutes': 'Protokoll',
    'Financial': 'Ekonomi',
    'Bylaws': 'Stadgar',
    'Audit': 'Revision',
    'Report': 'Rapport',
    'Planning': 'Planering',
    '2025 Agenda': '2025 Dagordning',
    'Application': 'Ansökan',
    'First Meeting': 'Första möte',
    'Document': 'Dokument'
  };
  
  const swedishTitles = {
    'Board Meeting Minutes August 2025': 'Styrelsemöte Protokoll Augusti 2025',
    'Board Meeting Minutes 2023-1': 'Styrelsemöte Protokoll 2023-1',
    'Museum Startup Protocol 2023': 'Musetstartprotokooll 2023',
    'Economic Report 2024': 'Ekonomisk redovisning 2024',
    'Financial Report 2023-2025': 'Ekonomisk redovisning 2023-2025',
    'Articles of Association 2023': 'Föreningen stadgar 2023',
    'Auditor\'s Report': 'Revisionsberättelse',
    'Activity Report 2023-2025': 'Verksamhetsberättelse 2023-2025',
    'Operations Plan & Budget 2025-2026': 'Verksamhetsplan & Budget 2025-2026',
    'Annual Meeting Agenda 2025': 'Årsmötets dagordning 2025',
    'Organization Number Application': 'Ansökan om organisationsnummer',
    'First AI Museum Meeting': 'AI-museens första möte'
  };
  
  const swedishDescriptions = {
    'Latest board meeting protocol': 'Senaste styrelsemötesprotokoll',
    'Meeting protocol from board session': 'Mötesprotokoller från styrelsemöte',
    'Establishment and founding documentation': 'Etablerings- och grundningsdokumentation',
    'Financial documentation (signed)': 'Ekonomisk dokumentation (undertecknad)',
    'Economic review for two-year period': 'Ekonomisk granskning för tvåårsperioden',
    'Official organization bylaws and statutes': 'Officiella organisationsstadgar',
    'Annual audit and review statement': 'Årlig revision och granskningsrapport',
    'Operations and activities overview': 'Verksamhets- och aktivitetsöversikt',
    'Strategic plan and budget allocation': 'Strategisk plan och budgetallokering',
    'Meeting agenda with slideshow': 'Mötesprogram med presentation',
    'Official registration documentation': 'Officiell registreringsdokumentation',
    'August 11 - Meeting at Moumo': '11 augusti – Möte på Moumo'
  };
  
  return documents.map(doc => {
    const colorClass = categoryColors[doc.category] || 'bg-gray-900 text-gray-300';
    const swedishCategory = swedishCategories[doc.category] || doc.category;
    const swedishTitle = swedishTitles[doc.title] || doc.title;
    const swedishDescription = swedishDescriptions[doc.description] || doc.description;
    
    return `
        <!-- Document: ${doc.filename} -->
        <a href="${assetsPrefix}/documents/${doc.filename}" target="_blank" rel="noopener noreferrer" class="glass-card p-6 rounded-xl border border-slate-700 hover:border-cyan-400 hover:shadow-lg transition-all duration-300 flex flex-col">
          <div class="flex items-start justify-between mb-4">
            <i class="fa-solid fa-file-pdf text-red-500 text-2xl"></i>
            <span class="text-xs ${colorClass} px-2 py-1 rounded">${swedishCategory}</span>
          </div>
          <h3 class="text-lg font-bold mb-2 text-slate-100">${swedishTitle}</h3>
          <p class="text-slate-400 text-sm flex-grow mb-4">${swedishDescription}</p>
          <span class="text-cyan-400 text-sm font-medium">Ladda ner PDF →</span>
        </a>`;
  }).join('\n');
}

const documents = getDocuments();

module.exports = {
  template: 'meeting',
  locales: {
    en: {
      output: 'pages/meeting.html',
      lang: 'en',
      title: 'Annual Meeting Documents',
      assetsPrefix: '..',
      indexHref: '../index.html',
      navHomeText: 'Back to Home',
      heroTitle: 'Annual Meeting Documents',
      heroCopy: 'Welcome to our document repository for annual meetings and association proceedings. All documents are available for download below.',
      documentCards: generateDocumentCards(documents, '..'),
      infoTitle: 'Document Information',
      infoText: 'All documents are available for public download and review. These materials represent official records of Museum of Artificial Intelligence association meetings, financial reports, and organizational documentation.',
      infoPoints: [
        'All PDFs are in Swedish',
        'Documents are official and signed where applicable',
        'Click any document to open or download'
      ],
      infoPointsHtml: generateInfoPointsHtml([
        'All PDFs are in Swedish',
        'Documents are official and signed where applicable',
        'Click any document to open or download'
      ]),
      ctaText: 'Questions about these documents?',
      footerText: '&copy; 2025 Museum of Artificial Intelligence.',
      headExtras: `  <link rel="alternate" hreflang="en" href="../pages/meeting">
  <link rel="alternate" hreflang="sv" href="../sv/pages/meeting">`,
      postScripts: ''
    },
    sv: {
      output: 'sv/pages/meeting.html',
      lang: 'sv',
      title: 'Mötes- och föreningsdokument',
      assetsPrefix: '../..',
      indexHref: '../index.html',
      navHomeText: 'Till startsidan',
      heroTitle: 'Mötes- och föreningsdokument',
      heroCopy: 'Välkommen till vår dokumentarkiv för årsmöten och föreningens protokoll. Alla dokument är tillgängliga för nedladdning nedan.',
      documentCards: generateSwedishDocumentCards(documents, '../..'),
      infoTitle: 'Dokumentinformation',
      infoText: 'Alla dokument är tillgängliga för offentlig nedladdning och granskning. Dessa material representerar officiella register från Museet för Artificiell Intelligens föreningens möten, finansiella rapporter och organisationsdokumentation.',
      infoPoints: [
        'Alla PDF-filer är på svenska',
        'Dokumenten är officiella och undertecknade där tillämpligt',
        'Klicka på vilket dokument som helst för att öppna eller ladda ner'
      ],
      infoPointsHtml: generateInfoPointsHtml([
        'Alla PDF-filer är på svenska',
        'Dokumenten är officiella och undertecknade där tillämpligt',
        'Klicka på vilket dokument som helst för att öppna eller ladda ner'
      ]),
      ctaText: 'Frågor om dessa dokument?',
      footerText: '&copy; 2025 Museum of Artificial Intelligence.',
      headExtras: `  <link rel="alternate" hreflang="sv" href="./meeting">
  <link rel="alternate" hreflang="en" href="../../pages/meeting">`,
      postScripts: ''
    }
  }
};
