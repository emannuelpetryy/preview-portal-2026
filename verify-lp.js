const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  let browser;
  try {
    console.log('=== INICIANDO VERIFICAÇÃO AUTOMATIZADA COMPLETA DA LP 02 (EDITORIAL MÉDICO & ACOLHIMENTO HUMANO) ===');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.toString()));

    const filePath = path.resolve('C:/Users/Usuario/Downloads/Antigravity/Projetos/lp-coluna-autoridade/index.html');
    const fileUrl = 'file:///' + filePath.replace(/\\/g, '/');
    console.log('1. Carregando Landing Page oficial:', fileUrl);

    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    // 1. Verificação de Título e Metas
    const title = await page.title();
    console.log('Título da página:', title);

    // 2. Garante carregamento completo de imagens com auto-scroll
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 500;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, 50);
      });
    });
    await new Promise(r => setTimeout(r, 400));

    // Captura de Screenshots Desktop (Hero Viewport e Full Page)
    const desktopScreenshotPath = 'C:/Users/Usuario/Downloads/Antigravity/Projetos/lp-coluna-autoridade/preview-desktop.png';
    await page.screenshot({ path: desktopScreenshotPath, fullPage: false });
    console.log('Screenshot Hero Desktop gravado em:', desktopScreenshotPath);

    const desktopFullPath = 'C:/Users/Usuario/Downloads/Antigravity/Projetos/lp-coluna-autoridade/preview-full-desktop.png';
    await page.screenshot({ path: desktopFullPath, fullPage: true });
    console.log('Screenshot Full Page Desktop gravado em:', desktopFullPath);

    // 3. Teste do Botão de Alternância de Tags Wix CMS
    await page.click('#cmsToggleBtn');
    const tagsAudit = await page.evaluate(() => {
      const isVisible = document.body.classList.contains('show-wix-tags');
      const pill = document.querySelector('.unit-dynamic-pill');
      const pillAfter = window.getComputedStyle(pill, '::after').content;
      const marker = pill.querySelector('.wix-field-marker');
      const markerAfter = window.getComputedStyle(marker, '::after').content;
      const fisioBox = document.querySelector('.team-member-item .member-avatar-box');
      const fisioBoxAfter = window.getComputedStyle(fisioBox, '::after').content;

      return {
        isVisible,
        pillAfter,
        markerAfter,
        fisioBoxAfter,
        hasDuplicatePillTag: pillAfter !== 'none' && markerAfter !== 'none'
      };
    });
    console.log('Alternância para exibição de tags Wix CMS ativada:', tagsAudit);

    if (tagsAudit.hasDuplicatePillTag) {
      throw new Error('Falha de tags: detectada tag duplicada no elemento .unit-dynamic-pill');
    }
    if (!tagsAudit.fisioBoxAfter.includes('{imagemFisio}')) {
      throw new Error('Falha de tags: tag {imagemFisio} não foi renderizada no avatar');
    }
    
    await page.screenshot({
      path: 'C:/Users/Usuario/Downloads/Antigravity/Projetos/lp-coluna-autoridade/preview-banner-desktop.png',
      fullPage: false
    });
    console.log('Screenshot com tags Wix CMS salvo em preview-banner-desktop.png');

    // Desativa modo tags para os próximos testes
    await page.click('#cmsToggleBtn');

    // 4. Teste e Captura Viewport Mobile (iPhone 14/15 390x844)
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.evaluate(() => window.scrollTo(0, 0));

    const mobileScreenPath = 'C:/Users/Usuario/Downloads/Antigravity/Projetos/lp-coluna-autoridade/preview-mobile-screen.png';
    await page.screenshot({ path: mobileScreenPath, fullPage: false });
    console.log('Screenshot Mobile Viewport salvo em:', mobileScreenPath);

    const mobileFullPath = 'C:/Users/Usuario/Downloads/Antigravity/Projetos/lp-coluna-autoridade/preview-mobile.png';
    await page.evaluate(() => {
      const dock = document.querySelector('.mobile-sticky-dock');
      if (dock) dock.style.display = 'none';
    });
    await page.screenshot({ path: mobileFullPath, fullPage: true });
    await page.evaluate(() => {
      const dock = document.querySelector('.mobile-sticky-dock');
      if (dock) dock.style.display = '';
    });
    console.log('Screenshot Mobile Full Page salvo em:', mobileFullPath);

    // 4.0.1 Validação da .wix-cms-toolbar Estática no Topo no Mobile (sem cobrir o Hero)
    console.log('4.0.1 Validando .wix-cms-toolbar Estática no Topo no Mobile...');
    const mobileToolbarAudit = await page.evaluate(() => {
      const toolbar = document.querySelector('.wix-cms-toolbar');
      const header = document.querySelector('.site-header');
      const note = document.querySelector('.hero-editorial-note');
      if (!toolbar) return { exists: false };
      const tStyle = window.getComputedStyle(toolbar);
      const tRect = toolbar.getBoundingClientRect();
      const nRect = note ? note.getBoundingClientRect() : null;
      const hRect = header ? header.getBoundingClientRect() : null;

      const isPositionStaticOrRelative = tStyle.position === 'relative' || tStyle.position === 'static';
      const sitsAboveHeader = hRect ? tRect.bottom <= hRect.bottom : true;
      const overlapsNote = nRect ? !(tRect.bottom <= nRect.top || tRect.top >= nRect.bottom || tRect.right <= nRect.left || tRect.left >= nRect.right) : false;

      return {
        exists: true,
        position: tStyle.position,
        isPositionStaticOrRelative,
        sitsAboveHeader,
        overlapsNote,
        height: toolbar.offsetHeight,
        top: tRect.top
      };
    });
    console.log('Auditoria da .wix-cms-toolbar no mobile:', mobileToolbarAudit);
    if (!mobileToolbarAudit.exists) {
      throw new Error('.wix-cms-toolbar não encontrada no documento.');
    }
    if (!mobileToolbarAudit.isPositionStaticOrRelative) {
      throw new Error(`VIOLAÇÃO: .wix-cms-toolbar deve ser estática/relativa no mobile (posição computada: ${mobileToolbarAudit.position}).`);
    }
    if (mobileToolbarAudit.overlapsNote) {
      throw new Error('VIOLAÇÃO CRÍTICA: .wix-cms-toolbar está sobrepondo o texto do Hero no mobile!');
    }

    // 4.1 Teste de Viewport Estreito Android (360x640) - Com e Sem Tags Wix CMS
    await page.setViewport({ width: 360, height: 640, isMobile: true, hasTouch: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    
    // Sem tags
    const narrowAuditNoTags = await page.evaluate(() => {
      const dock = document.querySelector('.mobile-sticky-dock');
      const info = document.querySelector('.mobile-dock-unit-info');
      const hours = document.querySelector('.mobile-unit-hours');
      const docWidth = document.documentElement.scrollWidth;
      return {
        dockVisible: window.getComputedStyle(dock).display !== 'none',
        dockHeight: dock.offsetHeight,
        infoWidth: info.offsetWidth,
        hoursHeight: hours.offsetHeight,
        hoursWrapped: hours.offsetHeight > 20,
        docWidth,
        hasHorizontalOverflow: docWidth > 360
      };
    });
    console.log('Auditoria Viewport Estreito 360px (Sem tags):', narrowAuditNoTags);
    if (narrowAuditNoTags.hasHorizontalOverflow) {
      throw new Error(`Overflow horizontal detectado no viewport 360px: largura ${narrowAuditNoTags.docWidth}px`);
    }
    if (narrowAuditNoTags.hoursWrapped) {
      throw new Error(`Texto de horários quebrou linha desnecessariamente no dock 360px: altura ${narrowAuditNoTags.hoursHeight}px`);
    }

    // Com tags Wix CMS no viewport 360px
    await page.click('#cmsToggleBtn');
    const narrowAuditWithTags = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      return {
        docWidth,
        hasHorizontalOverflow: docWidth > 360
      };
    });
    console.log('Auditoria Viewport Estreito 360px (Com tags Wix CMS):', narrowAuditWithTags);
    if (narrowAuditWithTags.hasHorizontalOverflow) {
      throw new Error(`Overflow horizontal detectado no viewport 360px com tags Wix ativas: largura ${narrowAuditWithTags.docWidth}px`);
    }
    await page.click('#cmsToggleBtn'); // desativa

    // 4.2 Teste de Borda Viewport Ultra-Estreito 320px (iPhone SE / Telas Pequenas)
    await page.setViewport({ width: 320, height: 568, isMobile: true, hasTouch: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    const narrow320Audit = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      return {
        docWidth,
        hasHorizontalOverflow: docWidth > 320
      };
    });
    console.log('Auditoria Viewport Ultra-Estreito 320px (Sem tags):', narrow320Audit);
    if (narrow320Audit.hasHorizontalOverflow) {
      throw new Error(`Overflow horizontal detectado no viewport 320px: largura ${narrow320Audit.docWidth}px`);
    }

    // Restaura viewport desktop para os testes seguintes
    await page.setViewport({ width: 1440, height: 900 });

    // 4.3 Auditoria da .wix-cms-toolbar Estática no Desktop
    console.log('4.3 Validando .wix-cms-toolbar Estática no Topo no Desktop...');
    const desktopToolbarCheck = await page.evaluate(() => {
      const toolbar = document.querySelector('.wix-cms-toolbar');
      if (!toolbar) return { exists: false };
      const style = window.getComputedStyle(toolbar);
      return {
        exists: true,
        position: style.position,
        isStaticOrRelative: style.position === 'relative' || style.position === 'static',
        bgColor: style.backgroundColor
      };
    });
    console.log('Auditoria da .wix-cms-toolbar no desktop:', desktopToolbarCheck);
    if (!desktopToolbarCheck.exists) {
      throw new Error('.wix-cms-toolbar não encontrada no desktop.');
    }
    if (!desktopToolbarCheck.isStaticOrRelative) {
      throw new Error(`VIOLAÇÃO: .wix-cms-toolbar deve ser relativa/estática no desktop (posição computada: ${desktopToolbarCheck.position}).`);
    }

    // 4.4 Auditoria de Zero Pílulas Azuis Arredondadas (.section-badge-pill) e Presença do Indicador Editorial #10B981
    console.log('4.4 Validando Eliminação de Pílulas Azuis Arredondadas (.section-badge-pill)...');
    const badgeAudit = await page.evaluate(() => {
      const pills = Array.from(document.querySelectorAll('.section-badge-pill'));
      const violations = [];
      const rootStyle = window.getComputedStyle(document.documentElement);
      const emeraldVar = rootStyle.getPropertyValue('--color-emerald').trim();
      const blueSlateVar = rootStyle.getPropertyValue('--color-blue-slate').trim();
      const fontPrimaryVar = rootStyle.getPropertyValue('--font-primary').trim();

      if (!emeraldVar) {
        violations.push('Variável CSS --color-emerald não está definida no :root');
      }
      if (!blueSlateVar) {
        violations.push('Variável CSS --color-blue-slate não está definida no :root');
      }
      if (!fontPrimaryVar) {
        violations.push('Variável CSS --font-primary não está definida no :root');
      }

      pills.forEach((p, idx) => {
        const style = window.getComputedStyle(p);
        const beforeStyle = window.getComputedStyle(p, '::before');
        const bg = style.backgroundColor;
        const borderStyle = style.borderStyle;
        const borderWidth = parseFloat(style.borderWidth) || 0;
        const borderRadius = parseFloat(style.borderRadius) || 0;
        const fontWeight = style.fontWeight;
        const isTransparent = bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)' || bg === '';

        if (!isTransparent) {
          violations.push(`Pílula ${idx + 1} (${p.innerText.trim()}) possui background colorido: ${bg}`);
        }
        if (borderStyle !== 'none' && borderWidth > 0) {
          violations.push(`Pílula ${idx + 1} (${p.innerText.trim()}) possui borda: ${borderStyle} ${borderWidth}px`);
        }
        if (borderRadius > 4) {
          violations.push(`Pílula ${idx + 1} (${p.innerText.trim()}) possui border-radius arredondado: ${borderRadius}px`);
        }
        if (fontWeight !== '600') {
          violations.push(`Pílula ${idx + 1} (${p.innerText.trim()}) deve usar Lufga SemiBold (font-weight: 600, atual: ${fontWeight})`);
        }
        if (beforeStyle.backgroundColor !== 'rgb(16, 185, 129)') {
          violations.push(`Pílula ${idx + 1} (${p.innerText.trim()}) ::before não possui a cor verde sólida #10B981 (atual: ${beforeStyle.backgroundColor})`);
        }
      });
      return {
        totalPills: pills.length,
        emeraldVar,
        blueSlateVar,
        fontPrimaryVar,
        violations
      };
    });
    console.log('Auditoria de .section-badge-pill:', badgeAudit);
    if (badgeAudit.totalPills === 0) {
      throw new Error('Nenhum elemento .section-badge-pill foi encontrado na página.');
    }
    if (badgeAudit.violations.length > 0) {
      throw new Error('VIOLAÇÃO DE DESIGN: Encontradas violações nas rubricas editoriais:\n' + badgeAudit.violations.join('\n'));
    }

    // 4.5 Auditoria de Imagens Não Duplicadas (Hero vs Founder Spotlight)
    console.log('4.5 Validando Diferenciação de Fotos (Hero vs Founder Spotlight)...');
    const photosCheck = await page.evaluate(() => {
      const heroImg = document.querySelector('.hero-panoramic-frame img');
      const founderImg = document.querySelector('.founder-spotlight-card img');
      const heroSrc = heroImg ? (heroImg.getAttribute('src') || '') : '';
      const founderSrc = founderImg ? (founderImg.getAttribute('src') || '') : '';
      return {
        heroSrc,
        founderSrc,
        heroHasAtendimento: heroSrc.includes('hero-orientacao-clinica') || heroSrc.includes('doutor-atendimento-coluna'),
        founderHasFundadores: founderSrc.includes('doutores-fundadores'),
        areDifferent: heroSrc !== '' && founderSrc !== '' && heroSrc !== founderSrc
      };
    });
    console.log('Auditoria de Fotos Hero vs Founder:', photosCheck);
    if (!photosCheck.heroHasAtendimento) {
      throw new Error(`Hero deve exibir hero-orientacao-clinica.jpg, mas possui src: "${photosCheck.heroSrc}"`);
    }
    if (!photosCheck.founderHasFundadores) {
      throw new Error(`Founder Spotlight deve exibir doutores-fundadores.jpg, mas possui src: "${photosCheck.founderSrc}"`);
    }
    if (!photosCheck.areDifferent) {
      throw new Error('VIOLAÇÃO: A mesma foto está duplicada no Hero e no Founder Spotlight.');
    }

    // 5. Auditoria de Existência das 8 Dobras Específicas da LP 02
    const dobrasAudit = await page.evaluate(() => {
      return {
        dobra1_heroAutoridade: !!document.querySelector('.hero-block'),
        dobra2_comoAColunaAvisa: !!document.querySelector('.warning-signs-section'),
        dobra3_videoFundadores: !!document.querySelector('.founder-video-section'),
        dobra4_unidadeEquipeDestaque: !!document.querySelector('.unit-authority-section'),
        dobra5_protocolo3Etapas: !!document.querySelector('.protocol-timeline-section'),
        dobra6_depoimentosVideo: !!document.querySelector('.video-testimonials-section'),
        dobra7_faqObjetivo: !!document.querySelector('.faq-authority-section'),
        dobra8_fechamentoSelos: !!document.querySelector('.final-authority-cta'),
        footer_institucional: !!document.querySelector('.site-footer')
      };
    });
    console.log('Auditoria das 8 Dobras da Landing Page:', dobrasAudit);

    const missingDobras = Object.keys(dobrasAudit).filter(k => !dobrasAudit[k]);
    if (missingDobras.length > 0) {
      throw new Error('Dobras ausentes na Landing Page: ' + missingDobras.join(', '));
    }

    // 5.1 Validação do Hero Editorial Centralizado Claro (#F9FAFB) e Vitrine Panorâmica
    console.log('5.1 Validando Hero Editorial Centralizado e Vitrine Panorâmica...');
    const heroAudit = await page.evaluate(() => {
      const hero = document.querySelector('.hero-block');
      const centerStack = document.querySelector('.hero-center-stack');
      const style = window.getComputedStyle(hero);
      const bg = style.backgroundColor;
      const isDarkNavy = /rgb\(6,\s*26,\s*59\)|rgb\(3,\s*14,\s*34\)|#061a3b|#030e22/i.test(bg);

      const titleEl = document.querySelector('.hero-title');
      const titleText = titleEl ? titleEl.innerText.trim() : '';
      const hasCorrectTitle = titleText.includes('Sua Coluna Já Avisou: Não Espere Travar para Cuidar');
      
      const trustBadge = document.querySelector('.hero-trust-badge');
      const trustText = trustBadge ? trustBadge.innerText.trim() : '';
      const hasTrustBadge = /atendimento com fisioterapeuta especializado em/i.test(trustText) && /arauc[aá]ria/i.test(trustText);

      const panoramicFrame = document.querySelector('.hero-panoramic-frame');
      const panoramicImg = panoramicFrame ? panoramicFrame.querySelector('img') : null;
      const panoramicCaption = panoramicFrame ? panoramicFrame.querySelector('.hero-panoramic-caption') : null;
      const hasPanoramic = !!panoramicFrame && !!panoramicImg && (panoramicImg.getAttribute('src') || '').includes('hero-orientacao-clinica.jpg');
      const hasCaption = panoramicCaption ? panoramicCaption.innerText.includes('Avaliação presencial detalhada e cuidado conservador individualizado.') : false;

      const hasOldTwoCol = !!document.querySelector('.hero-grid') || !!document.querySelector('.hero-copy-column') || !!document.querySelector('.hero-visual-column');
      const hasThreeNumbers = !!document.querySelector('.hero-credentials-strip') || !!document.querySelector('.hero-stats-row');

      const highlight = document.querySelector('.hero-title-highlight');
      const highlightText = highlight ? highlight.innerText.trim() : '';
      const hasHighlight = highlightText === 'Não Espere Travar para Cuidar';

      const stackStyle = centerStack ? window.getComputedStyle(centerStack) : null;
      const isCentered = stackStyle ? stackStyle.textAlign === 'center' : false;

      const subtitle = document.querySelector('.hero-subtitle');
      const subtitleStyle = subtitle ? window.getComputedStyle(subtitle) : null;
      const hasSubtitleMaxW = subtitleStyle ? (parseFloat(subtitleStyle.maxWidth) <= 680) : false;

      return {
        bg,
        isDarkNavy,
        hasCenterStack: !!centerStack,
        isCentered,
        titleText,
        hasCorrectTitle,
        hasHighlight,
        hasSubtitleMaxW,
        trustText,
        hasTrustBadge,
        hasPanoramic,
        hasCaption,
        hasOldTwoCol,
        hasThreeNumbers
      };
    });
    console.log('Auditoria do Hero Editorial Centralizado:', heroAudit);
    if (heroAudit.isDarkNavy) {
      throw new Error('VIOLAÇÃO DE DESIGN: Hero ainda utiliza Dark Navy escuro. O Hero deve ser claro e respirado (#F9FAFB).');
    }
    if (!heroAudit.hasCenterStack || !heroAudit.isCentered) {
      throw new Error('Hero deve usar stack centralizado .hero-center-stack com text-align: center.');
    }
    if (!heroAudit.hasCorrectTitle) {
      throw new Error(`Título do Hero incorreto. Atual: "${heroAudit.titleText}"`);
    }
    if (!heroAudit.hasHighlight) {
      throw new Error('Título do Hero deve destacar "Não Espere Travar para Cuidar" via .hero-title-highlight.');
    }
    if (!heroAudit.hasSubtitleMaxW) {
      throw new Error('Subtítulo do Hero deve ter max-width em torno de 660px.');
    }
    if (!heroAudit.hasTrustBadge) {
      throw new Error('Micro-selo de confiança do Hero ausente ou não contém "Atendimento com fisioterapeuta especializado em Araucária".');
    }
    if (!heroAudit.hasPanoramic || !heroAudit.hasCaption) {
      throw new Error('Vitrine panorâmica do Hero ausente ou sem imagem/legenda correta.');
    }
    if (heroAudit.hasOldTwoCol) {
      throw new Error('VIOLAÇÃO: O Hero ainda contém estrutura de 2 colunas (.hero-grid/.hero-copy-column/.hero-visual-column).');
    }
    if (heroAudit.hasThreeNumbers) {
      throw new Error('VIOLAÇÃO: O Hero ainda contém os 3 números embaixo (.hero-credentials-strip).');
    }

    // 5.2 Teste do Repeater de Sintomas e Sinais de Alerta (4 Cards Enxutos)
    console.log('5.2 Validando Repeater de Sintomas da Coluna...');
    const symptomsAudit = await page.evaluate(() => {
      const grid = document.querySelector('.symptoms-repeater-grid');
      const cards = Array.from(document.querySelectorAll('.symptom-visual-card'));
      const ctaBtn = document.querySelector('.btn-symptom-cta');
      const ctaText = ctaBtn ? ctaBtn.innerText.trim() : '';

      const expectedTitles = [
        'Travamento ao Levantar',
        'Dificuldade ao Amarrar o Sapato',
        'Desconforto ao Ficar Sentado',
        'Formigamento Descendo para a Perna'
      ];

      const expectedDescriptions = [
        'Fisgada na lombar ao sair da cama ou cadeira.',
        'Rigidez ao flexionar o corpo.',
        'Queimação após horas de trabalho ou trânsito.',
        'Sinal de alerta do nervo ciático.'
      ];

      const cardDetails = cards.map(c => {
        const badge = c.querySelector('.symptom-alert-badge');
        const icon = c.querySelector('.symptom-icon-wrap svg');
        const title = c.querySelector('.symptom-card-title');
        const desc = c.querySelector('.symptom-card-desc');
        return {
          hasBadge: badge ? (badge.textContent.trim() === 'Sinal de Alerta' || /sinal de alerta/i.test(badge.innerText.trim())) : false,
          hasIcon: !!icon,
          title: title ? title.innerText.trim() : '',
          desc: desc ? desc.innerText.trim() : ''
        };
      });

      const titlesMatch = cardDetails.length === 4 && cardDetails.every((c, i) => c.title === expectedTitles[i]);
      const descsMatch = cardDetails.length === 4 && cardDetails.every((c, i) => c.desc === expectedDescriptions[i]);
      const badgesMatch = cardDetails.length === 4 && cardDetails.every(c => c.hasBadge && c.hasIcon);

      const html = document.body.innerHTML;
      const hasOldBloat = html.includes('Leitura Biomecânica') ||
                          html.includes('Situação no Dia a Dia') ||
                          html.includes('O que a Coluna Avisa') ||
                          html.includes('Impacto se Ignorado') ||
                          html.includes('Conduta Presencial') ||
                          !!document.getElementById('symptomProgressFill') ||
                          !!document.getElementById('symptomAssessmentPanel');

      const isCtaCorrect = ctaText.includes('Sentindo esses sinais? Agende sua avaliação preventiva');
      const ctaHasWpp = ctaBtn ? (ctaBtn.href.includes('whatsapp') || ctaBtn.dataset.wixTag === '{linkWpp}') : false;

      return {
        hasGrid: !!grid,
        totalCards: cards.length,
        titlesMatch,
        descsMatch,
        badgesMatch,
        hasOldBloat,
        isCtaCorrect,
        ctaHasWpp,
        cardDetails
      };
    });
    console.log('Auditoria do Repeater de Sintomas:', symptomsAudit);
    if (!symptomsAudit.hasGrid || symptomsAudit.totalCards !== 4) {
      throw new Error(`Dobra 2 deve possuir exatamente 4 cards no repeater, encontrado: ${symptomsAudit.totalCards}`);
    }
    if (!symptomsAudit.titlesMatch || !symptomsAudit.descsMatch || !symptomsAudit.badgesMatch) {
      throw new Error('Divergência nos títulos, descrições ou badges dos 4 cards de sintomas.');
    }
    if (symptomsAudit.hasOldBloat) {
      throw new Error('VIOLAÇÃO: Dobra 2 ainda contém texto denso de "prontuário médico" (Leitura Biomecânica, Impacto, etc.) ou painel antigo.');
    }
    if (!symptomsAudit.isCtaCorrect || !symptomsAudit.ctaHasWpp) {
      throw new Error('CTA de sintomas incorreto ou não conectado ao WhatsApp.');
    }

    // Teste de clique visual interativo no card de sintoma
    await page.click('.symptom-visual-card:nth-child(2)');
    await new Promise(r => setTimeout(r, 100));
    const cardSelectedCheck = await page.evaluate(() => {
      const card2 = document.querySelector('.symptom-visual-card:nth-child(2)');
      return card2 ? (card2.classList.contains('selected') || card2.classList.contains('is-selected')) : false;
    });
    console.log('Teste de seleção visual do card 2:', cardSelectedCheck);
    if (!cardSelectedCheck) {
      throw new Error('Card de sintoma deve receber classe .selected ao ser clicado.');
    }

    // 5.3 Auditoria dos Fundadores (Foto, Citação sem itálico, 3 Stats e Vídeo - Zero Timeline e Zero 3 Pilares)
    console.log('5.3 Auditando Seção dos Fundadores...');
    const founderAudit = await page.evaluate(() => {
      const section = document.querySelector('.founder-video-section');
      const photo = section ? section.querySelector('img[src*="doutores-fundadores"]') : null;
      const pullQuote = section ? section.querySelector('.founder-pull-quote') : null;
      const quoteText = pullQuote ? pullQuote.querySelector('.founder-quote-text') : null;
      const quoteStyle = quoteText ? window.getComputedStyle(quoteText) : null;
      
      const stats = Array.from(document.querySelectorAll('.founder-stat-item'));
      const statsText = stats.map(s => s.innerText.trim());
      const has350 = statsText.some(t => t.includes('+350 Clínicas'));
      const has3M = statsText.some(t => t.includes('+3 Milhões'));
      const has95 = statsText.some(t => t.includes('95,7%'));

      const videoFrame = document.querySelector('#founderVideoContainer');
      const iframe = videoFrame ? videoFrame.querySelector('iframe') : null;
      const videoTitle = document.querySelector('.founder-video-title');
      const videoTitleText = videoTitle ? videoTitle.innerText.trim() : '';

      const html = section ? section.innerHTML : '';
      const hasTimeline = html.includes('timeline-milestone') || html.includes('2005') || html.includes('2012');
      const hasThreePillars = html.includes('Pilar 01') || html.includes('Pilar 02') || html.includes('video-scientific-pillars');

      const twoColGrid = section ? section.querySelector('.founder-two-col-grid') : null;
      const col1 = section ? section.querySelector('.founder-info-column') : null;
      const col2 = section ? section.querySelector('.founder-video-column') : null;
      const statsInLeftCol = col1 ? col1.querySelectorAll('.founder-stat-item').length === 3 : false;
      const videoCardInRightCol = col2 ? !!col2.querySelector('.founder-video-card #founderVideoContainer') : false;
      const gridStyle = twoColGrid ? window.getComputedStyle(twoColGrid) : null;
      const col1Rect = col1 ? col1.getBoundingClientRect() : null;
      const col2Rect = col2 ? col2.getBoundingClientRect() : null;
      const videoFrameRect = videoFrame ? videoFrame.getBoundingClientRect() : null;

      const isTwoColGrid = gridStyle ? (gridStyle.display === 'grid' && gridStyle.gridTemplateColumns.split(' ').length === 2) : false;
      const isSideBySide = (col1Rect && col2Rect) ? (col1Rect.left < col2Rect.left && Math.abs(col1Rect.top - col2Rect.top) < 120 && col1Rect.width < 800 && col2Rect.width < 800) : false;
      const hasProperVideoHeight = videoFrameRect ? videoFrameRect.height >= 200 : false;

      return {
        hasSection: !!section,
        hasPhoto: !!photo,
        hasPullQuote: !!pullQuote,
        isItalic: quoteStyle ? quoteStyle.fontStyle === 'italic' : false,
        statsCount: stats.length,
        hasAllStats: has350 && has3M && has95,
        statsInLeftCol,
        videoCardInRightCol,
        hasVideo: !!iframe,
        videoTitleText,
        hasTimeline,
        hasThreePillars,
        isTwoColGrid,
        isSideBySide,
        hasProperVideoHeight
      };
    });
    console.log('Auditoria dos Fundadores:', founderAudit);
    if (!founderAudit.hasSection || !founderAudit.hasPhoto || !founderAudit.hasPullQuote) {
      throw new Error('Seção dos fundadores incompleta (foto ou citação ausente).');
    }
    if (!founderAudit.isTwoColGrid || !founderAudit.isSideBySide) {
      throw new Error('VIOLAÇÃO DE LAYOUT: Seção dos fundadores não está renderizando em 2 colunas equilibradas (1fr 1fr) lado a lado no desktop.');
    }
    if (!founderAudit.statsInLeftCol || !founderAudit.videoCardInRightCol) {
      throw new Error('VIOLAÇÃO DE ESTRUTURA: Selos devem estar na coluna esquerda e card do vídeo na coluna direita.');
    }
    if (!founderAudit.hasProperVideoHeight) {
      throw new Error('VIOLAÇÃO: O player de vídeo dos fundadores está com altura insuficiente ou esmagada.');
    }
    if (founderAudit.isItalic) {
      throw new Error('VIOLAÇÃO DE DESIGN: Citação dos fundadores está em itálico. Regra de design exige zero itálico.');
    }
    if (founderAudit.statsCount !== 3 || !founderAudit.hasAllStats) {
      throw new Error('3 dados de autoridade (+350 Clínicas, +3 Milhões, 95,7%) ausentes ou incorretos.');
    }
    if (!founderAudit.hasVideo) {
      throw new Error('Vídeo dos fundadores ausente.');
    }
    if (founderAudit.hasTimeline) {
      throw new Error('VIOLAÇÃO: Linha do tempo (2005/2012/2026) ainda está presente na seção dos fundadores.');
    }
    if (founderAudit.hasThreePillars) {
      throw new Error('VIOLAÇÃO: 3 pilares de texto ainda estão presentes na seção dos fundadores.');
    }

    // 5.4 Auditoria das Histórias de Recuperação (Casos Clínicos Leves: Vídeo, Tag, Citação Direta, Paciente e Zero Itálico)
    console.log('5.4 Auditando Histórias de Recuperação...');
    const casesAudit = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.testimonial-video-card'));
      const italicElements = [];
      
      cards.forEach((card, idx) => {
        const textElements = Array.from(card.querySelectorAll('*'));
        textElements.forEach(el => {
          if (window.getComputedStyle(el).fontStyle === 'italic') {
            italicElements.push(`Elemento em itálico no card ${idx + 1}: ${el.tagName} (${el.className})`);
          }
        });
      });

      const cardData = cards.map((c, idx) => {
        const video = c.querySelector('.testimonial-media-wrap iframe, .testimonial-media-wrap .video-poster-overlay');
        const profile = c.querySelector('.case-study-profile');
        const quote = c.querySelector('.testimonial-quote-text');
        const patientRow = c.querySelector('.testimonial-patient-row');
        const verified = c.querySelector('.patient-verified-badge');
        const hasBefore = !!c.querySelector('.case-before');
        const hasAfter = !!c.querySelector('.case-after');
        return {
          card: idx + 1,
          hasVideo: !!video,
          hasProfile: !!profile,
          hasQuote: !!quote,
          hasPatientRow: !!patientRow,
          hasVerified: !!verified,
          hasBefore,
          hasAfter
        };
      });

      return {
        totalCards: cards.length,
        cardData,
        hasItalic: italicElements.length > 0,
        italicElements
      };
    });
    console.log('Auditoria das Histórias de Recuperação:', casesAudit);
    if (casesAudit.totalCards !== 3) {
      throw new Error(`Número incorreto de cartões de histórias de recuperação: ${casesAudit.totalCards} (esperado: 3).`);
    }
    const invalidCards = casesAudit.cardData.filter(c => !c.hasVideo || !c.hasProfile || !c.hasQuote || !c.hasPatientRow || !c.hasVerified);
    if (invalidCards.length > 0) {
      throw new Error('Cards de depoimento devem conter vídeo, perfil, citação, paciente e selo verificado.');
    }
    const hasOldComparisons = casesAudit.cardData.some(c => c.hasBefore || c.hasAfter);
    if (hasOldComparisons) {
      throw new Error('VIOLAÇÃO: Cards de depoimento ainda contêm os blocos pesados "Como estava antes" / "Como vive hoje".');
    }
    if (casesAudit.hasItalic) {
      throw new Error('VIOLAÇÃO DE DESIGN: Encontrados elementos em itálico nos depoimentos:\n' + casesAudit.italicElements.join('\n'));
    }

    // 6. Auditoria de CTAs: VETO ABSOLUTO AO VERMELHO
    const ctaAudit = await page.evaluate(() => {
      const rootComputed = window.getComputedStyle(document.documentElement);
      const colorPrimaryCta = rootComputed.getPropertyValue('--color-primary-cta').trim().toLowerCase();
      const colorPrimaryCtaHover = rootComputed.getPropertyValue('--color-primary-cta-hover').trim().toLowerCase();

      const buttons = Array.from(document.querySelectorAll('a[class*="btn"], button[class*="btn"]'));
      const redViolations = [];

      buttons.forEach(btn => {
        const style = window.getComputedStyle(btn);
        const bg = (style.backgroundColor || '') + ' ' + (style.backgroundImage || '');
        const color = style.color || '';

        if (/b10f0b|8c0b08|9e0d09|760907|177,\s*15,\s*11|140,\s*11,\s*8|rgb\(255,\s*0,\s*0\)|#ff0000|#e11d48|#dc2626|#ef4444/i.test(bg + ' ' + color)) {
          redViolations.push(`Botão com vermelho proibido: ${btn.className} [${bg}]`);
        }
      });

      return {
        colorPrimaryCta,
        colorPrimaryCtaHover,
        totalCtaButtons: buttons.length,
        redViolations
      };
    });
    console.log('Auditoria de Cores dos CTAs:', ctaAudit);

    if (ctaAudit.colorPrimaryCta.includes('#b10f0b') || ctaAudit.colorPrimaryCta.includes('rgb(177, 15, 11)')) {
      throw new Error(`VIOLAÇÃO CRÍTICA: --color-primary-cta ainda está em vermelho: ${ctaAudit.colorPrimaryCta}`);
    }

    if (ctaAudit.redViolations.length > 0) {
      throw new Error(`VIOLAÇÃO CRÍTICA: Encontrados botões em vermelho:\n${ctaAudit.redViolations.join('\n')}`);
    }

    // 7. Auditoria do Quadro Editorial Unificado das 3 Etapas do Protocolo (Capítulos e <= 15 Palavras)
    const protocolAudit = await page.evaluate(() => {
      const board = document.querySelector('.protocol-editorial-board');
      const cards = Array.from(document.querySelectorAll('.protocol-step-card'));
      const chapters = Array.from(document.querySelectorAll('.step-chapter-label')).map(c => c.innerText.trim());
      const steps = Array.from(document.querySelectorAll('.protocol-step-card .step-description'));

      const hasBoard = !!board;
      const totalCards = cards.length;
      const chapterMatches = chapters.some(c => /cap[ií]tulo\s*01/i.test(c)) &&
                             chapters.some(c => /cap[ií]tulo\s*02/i.test(c)) &&
                             chapters.some(c => /cap[ií]tulo\s*03/i.test(c));

      const stepData = steps.map((s, idx) => ({
        step: idx + 1,
        text: s.innerText.trim(),
        length: s.innerText.trim().length,
        words: s.innerText.trim().split(/\s+/).length
      }));

      return {
        hasBoard,
        totalCards,
        chapterMatches,
        chapters,
        stepData
      };
    });
    console.log('Auditoria dos Textos das 3 Etapas do Protocolo:', protocolAudit);

    if (!protocolAudit.hasBoard) {
      throw new Error('Quadro editorial unificado .protocol-editorial-board não encontrado na Dobra 5.');
    }
    if (protocolAudit.totalCards !== 3) {
      throw new Error(`Dobra 5 deve conter exatamente 3 etapas, encontrado: ${protocolAudit.totalCards}`);
    }
    if (!protocolAudit.chapterMatches) {
      throw new Error(`Capítulos do protocolo incorretos: ${JSON.stringify(protocolAudit.chapters)}`);
    }

    protocolAudit.stepData.forEach(st => {
      if (st.words > 15) {
        throw new Error(`Etapa ${st.step} do protocolo excede o limite estrito de 15 palavras: ${st.words} palavras`);
      }
    });

    // 8. Auditoria de Compliance, Emojis, Exclamações e Placeholders Wix CMS
    const domAudit = await page.evaluate(() => {
      const text = document.body.innerText;
      const rawHtml = document.documentElement.outerHTML;
      const violations = [];

      // Isenção explícita autorizada para as duas frases literais exigidas pelo usuário:
      const sanitizedText = text
        .replace(/sua\s+coluna\s+j[aá]\s+avisou/gi, '')
        .replace(/agende\s+sua\s+avalia[cç][aã]o\s+preventiva/gi, '');

      // Veto a atributos pessoais em 2ª pessoa
      if (/\bsua dor\b/i.test(sanitizedText)) violations.push('VIOLAÇÃO: Encontrado "sua dor"');
      if (/\bseu corpo\b/i.test(sanitizedText)) violations.push('VIOLAÇÃO: Encontrado "seu corpo"');
      if (/\bsua rotina\b/i.test(sanitizedText)) violations.push('VIOLAÇÃO: Encontrado "sua rotina"');
      if (/\bseu quadro\b/i.test(sanitizedText)) violations.push('VIOLAÇÃO: Encontrado "seu quadro"');
      if (/\bsua coluna\b/i.test(sanitizedText)) violations.push('VIOLAÇÃO: Encontrado "sua coluna"');
      if (/\bseu problema\b/i.test(sanitizedText)) violations.push('VIOLAÇÃO: Encontrado "seu problema"');
      if (/\bseus sintomas\b/i.test(sanitizedText)) violations.push('VIOLAÇÃO: Encontrado "seus sintomas"');
      if (/\bsuas?\s+atividades\b/i.test(sanitizedText)) violations.push('VIOLAÇÃO: Encontrado "suas atividades"');
      if (/\bsua\s+avalia[cç][aã]o\b/i.test(sanitizedText)) violations.push('VIOLAÇÃO: Encontrado "sua avaliação"');

      // Veto a promessas absolutas
      if (/viver sem dor/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "viver sem dor"');
      if (/cura definitiva/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "cura definitiva"');
      if (/garantido/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "garantido"');
      if (/a única solução/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "a única solução"');
      if (/a principal causa/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "a principal causa"');
      if (/com certeza/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "com certeza"');

      // Veto a links de fuga
      if (/link na bio/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "link na bio"');

      // Veto a 100% Não Invasivo
      if (/100%\s*n[aã]o\s*invasivo/i.test(text) || /100%\s*n[aã]o\s*invasivo/i.test(rawHtml)) {
        violations.push('VIOLAÇÃO: Encontrado "100% Não Invasivo" no texto ou HTML da página');
      }

      // Veto a travessões de IA
      if (/—|--/.test(text)) violations.push('VIOLAÇÃO: Encontrado travessão de IA');

      // Veto a Emojis Unicode
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      if (emojiRegex.test(text)) {
        violations.push('VIOLAÇÃO: Encontrado emoji unicode no texto da página');
      }

      // Veto a Exclamações (!)
      if (text.includes('!')) {
        violations.push('VIOLAÇÃO: Encontrado ponto de exclamação (!) no texto');
      }

      const wppLinks = Array.from(document.querySelectorAll('a[href*="whatsapp.com"], a[href*="wa.me"]'));
      wppLinks.forEach(link => {
        if (link.href.includes('!') || link.href.includes('%21')) {
          violations.push(`VIOLAÇÃO: Encontrado ponto de exclamação (!) na mensagem do WhatsApp: ${link.href}`);
        }
      });

      // Verificação da Equipe Oficial de Fisioterapeutas de Araucária
      const officialFisiosFound = rawHtml.includes('GABRIELA AMARAL') && rawHtml.includes('DÉBORA AMARAL');
      if (!officialFisiosFound) violations.push('VIOLAÇÃO: Equipe oficial de fisioterapeutas de Araucária não encontrada');

      // Verificação dos Placeholders Oficiais do Wix CMS nas 8 dobras
      const placeholdersFound = {
        title: rawHtml.includes('{title}'),
        horario: rawHtml.includes('{horario}'),
        diasSemana: rawHtml.includes('{diasSemana}'),
        linkWpp: rawHtml.includes('{linkWpp}'),
        endereoTexto: rawHtml.includes('{endereoTexto}'),
        telefone: rawHtml.includes('{telefone}'),
        whatsapp: rawHtml.includes('{whatsapp}'),
        linkVerNoMapa: rawHtml.includes('{linkVerNoMapa}'),
        slidesFotosUnidades: rawHtml.includes('{slidesFotosUnidades}'),
        imagemFisio: rawHtml.includes('{imagemFisio}'),
        fisioterapeutasResponsveis: rawHtml.includes('{fisioterapeutasResponsveis}'),
        imagemFisio1: rawHtml.includes('{imagemFisio1}'),
        fisioterapeutasResponsveis1: rawHtml.includes('{fisioterapeutasResponsveis1}'),
        video_youtube_pq_dores_costas: rawHtml.includes('{video_youtube_pq_dores_costas}'),
        video_youtube_depoimento_1: rawHtml.includes('{video_youtube_depoimento_1}'),
        video_youtube_depoimento_2: rawHtml.includes('{video_youtube_depoimento_2}'),
        video_youtube_depoimento_3: rawHtml.includes('{video_youtube_depoimento_3}'),
        redessociais: rawHtml.includes('{redessociais}'),
        redessociais1: rawHtml.includes('{redessociais1}')
      };

      const fontLoaded = document.fonts.check('16px Lufga');

      return {
        violations,
        placeholdersFound,
        fontLoaded,
        hasImages: document.querySelectorAll('img').length,
        hasVideos: document.querySelectorAll('iframe').length
      };
    });

    console.log('Auditoria de Compliance e Placeholders Wix CMS:', domAudit);
    console.log('Erros no console do navegador:', consoleErrors);

    if (domAudit.violations.length > 0) {
      throw new Error('Falha de compliance detectada:\n' + domAudit.violations.join('\n'));
    }

    if (consoleErrors.length > 0) {
      throw new Error('Erros de console detectados:\n' + consoleErrors.join('\n'));
    }

    const missingPlaceholders = Object.keys(domAudit.placeholdersFound).filter(k => !domAudit.placeholdersFound[k]);
    if (missingPlaceholders.length > 0) {
      throw new Error('Placeholders Wix CMS ausentes:\n' + missingPlaceholders.join('\n'));
    }

    // 8.0.1 Validação Estrita de Zero Ocorrência de "100% Não Invasivo"
    console.log('8.0.1 Validando Zero Ocorrência de "100% Não Invasivo"...');
    const nonInvasiveCheck = await page.evaluate(() => {
      const text = document.body.innerText;
      const html = document.documentElement.outerHTML;
      const inText = /100%\s*n[aã]o\s*invasivo/i.test(text);
      const inHtml = /100%\s*n[aã]o\s*invasivo/i.test(html);
      return { inText, inHtml };
    });
    console.log('Auditoria de "100% Não Invasivo":', nonInvasiveCheck);
    if (nonInvasiveCheck.inText || nonInvasiveCheck.inHtml) {
      throw new Error('VIOLAÇÃO CRÍTICA DE COMPLIANCE: O termo "100% Não Invasivo" ainda existe na página.');
    }

    // 8.1 Teste Interativo de Vídeos (Offset Click e Keyboard Enter)
    console.log('8.1 Testando Interatividade e Acessibilidade dos Players de Vídeo...');
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      const el = document.querySelector('#founderVideoContainer');
      if (el) el.scrollIntoView({ block: 'center' });
    });
    await new Promise(r => setTimeout(r, 150));

    // Teste de clique com mouse fora do centro (offset 80, 80)
    const founderBox = await page.evaluate(() => {
      const el = document.querySelector('#founderVideoContainer');
      const r = el.getBoundingClientRect();
      return { x: r.left + 80, y: r.top + 80 };
    });
    await page.mouse.click(founderBox.x, founderBox.y);
    await new Promise(r => setTimeout(r, 250));

    const founderPlayAudit = await page.evaluate(() => {
      const c = document.querySelector('#founderVideoContainer');
      const iframe = c.querySelector('iframe');
      const overlay = c.querySelector('.video-poster-overlay');
      return {
        hasOverlay: !!overlay,
        iframeSrc: iframe ? iframe.src : '',
        autoplayActive: iframe ? iframe.src.includes('autoplay=1') : false
      };
    });
    console.log('Auditoria de Play por Clique no Poster:', founderPlayAudit);

    if (founderPlayAudit.hasOverlay || !founderPlayAudit.autoplayActive) {
      throw new Error('Falha no clique do vídeo dos fundadores: poster não foi substituído por iframe com autoplay.');
    }

    // Teste de acessibilidade por teclado (Enter no depoimento 1)
    await page.evaluate(() => {
      const el = document.querySelector('#depoimentos .testimonial-media-wrap');
      if (el) el.scrollIntoView({ block: 'center' });
    });
    await new Promise(r => setTimeout(r, 150));
    await page.focus('#depoimentos .testimonial-media-wrap .video-poster-overlay');
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 250));

    const keyPlayAudit = await page.evaluate(() => {
      const c = document.querySelector('#depoimentos .testimonial-media-wrap');
      const iframe = c.querySelector('iframe');
      const overlay = c.querySelector('.video-poster-overlay');
      return {
        hasOverlay: !!overlay,
        iframeSrc: iframe ? iframe.src : '',
        autoplayActive: iframe ? iframe.src.includes('autoplay=1') : false
      };
    });
    console.log('Auditoria de Play por Teclado (Enter):', keyPlayAudit);

    if (keyPlayAudit.hasOverlay || !keyPlayAudit.autoplayActive) {
      throw new Error('Falha de acessibilidade: tecla Enter não acionou reprodução do vídeo de depoimento.');
    }

    // 9. Teste de Borda com Parâmetros Dinâmicos e Nome de Unidade Longo
    console.log('9. Testando Parâmetros Dinâmicos e Nome Longo de Unidade...');
    const edgeUrl = fileUrl + '?unidade=' + encodeURIComponent('UNIDADE PRESIDENTE PRUDENTE E SÃO JOSÉ DO RIO PRETO - SP') +
      '&whatsapp=18999998888&telefone=(18)%203222-1111&endereco=Avenida%20Coronel%20Jos%C3%A9%20Soares%20Marcondes%2C%201200&horario=07:30%20-%2019:00&diasSemana=Seg-Sab';
    
    await page.goto(edgeUrl, { waitUntil: 'networkidle0' });

    const dynamicAudit = await page.evaluate(() => {
      const headerTitle = document.querySelector('.site-header .unit-dynamic-pill .wix-field-marker').textContent;
      const headerHeight = document.querySelector('.site-header').offsetHeight;
      const dockTitle = document.querySelector('.mobile-unit-title').textContent;
      const enderecoText = document.querySelector('[data-wix-tag="{endereoTexto}"]').textContent;
      const wppLink = document.querySelector('#heroCtaButton').href;

      return {
        headerTitle,
        headerHeight,
        dockTitle,
        enderecoText,
        wppLinkMatches: wppLink.includes('5518999998888')
      };
    });
    console.log('Auditoria do Teste de Borda Dinâmico:', dynamicAudit);

    if (!dynamicAudit.headerTitle.includes('PRESIDENTE PRUDENTE')) {
      throw new Error('Parâmetro dinâmico da unidade não refletiu no cabeçalho.');
    }

    if (!dynamicAudit.wppLinkMatches) {
      throw new Error('Link dinâmico de WhatsApp não foi atualizado corretamente.');
    }

    console.log('=== TODOS OS TESTES PASSARAM COM 100% DE SUCESSO! ===');
  } catch (err) {
    console.error('ERRO NA AUDITORIA:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
