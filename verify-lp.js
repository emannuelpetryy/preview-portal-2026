const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  let browser;
  try {
    console.log('=== INICIANDO VERIFICAÇÃO AUTOMATIZADA COMPLETA DA LP 02 (AUTORIDADE & CONSCIENTIZAÇÃO) ===');
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

    // 4.1 Teste de Viewport Estreito Android (360x640)
    await page.setViewport({ width: 360, height: 640, isMobile: true, hasTouch: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    const narrowAudit = await page.evaluate(() => {
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
    console.log('Auditoria Viewport Estreito 360px:', narrowAudit);
    if (narrowAudit.hasHorizontalOverflow) {
      throw new Error(`Overflow horizontal detectado no viewport 360px: largura ${narrowAudit.docWidth}px`);
    }
    if (narrowAudit.hoursWrapped) {
      throw new Error(`Texto de horários quebrou linha desnecessariamente no dock 360px: altura ${narrowAudit.hoursHeight}px`);
    }

    // Restaura viewport desktop para os testes seguintes
    await page.setViewport({ width: 1440, height: 900 });

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

    // 6. Auditoria de CTAs: VETO ABSOLUTO AO VERMELHO E VALIDAÇÃO DO AZUL ROYAL
    const ctaAudit = await page.evaluate(() => {
      const rootComputed = window.getComputedStyle(document.documentElement);
      const colorPrimaryCta = rootComputed.getPropertyValue('--color-primary-cta').trim().toLowerCase();
      const colorPrimaryCtaHover = rootComputed.getPropertyValue('--color-primary-cta-hover').trim().toLowerCase();

      // Busca todos os botões e links de CTA na página
      const buttons = Array.from(document.querySelectorAll('a[class*="btn"], button[class*="btn"]'));
      const redViolations = [];

      buttons.forEach(btn => {
        const style = window.getComputedStyle(btn);
        const bg = (style.backgroundColor || '') + ' ' + (style.backgroundImage || '');
        const color = style.color || '';

        // Detecção de vermelho proibido (#B10F0B, #8C0B08, rgb(177, 15, 11), etc.)
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

    // 7. Auditoria de Textos das Etapas do Protocolo (Máximo 2 Linhas por Etapa)
    const protocolAudit = await page.evaluate(() => {
      const steps = Array.from(document.querySelectorAll('.protocol-step-card .step-description'));
      return steps.map((s, idx) => ({
        step: idx + 1,
        text: s.innerText.trim(),
        length: s.innerText.trim().length,
        words: s.innerText.trim().split(/\s+/).length
      }));
    });
    console.log('Auditoria dos Textos das 3 Etapas do Protocolo:', protocolAudit);

    protocolAudit.forEach(st => {
      if (st.words > 30) {
        throw new Error(`Etapa ${st.step} do protocolo excede o limite estrito de concisão: ${st.words} palavras`);
      }
    });

    // 8. Auditoria de Compliance e Copywriting (Zero Atributos Pessoais, Zero Promessas Absolutas)
    const domAudit = await page.evaluate(() => {
      const text = document.body.innerText;
      const violations = [];

      // Veto a atributos pessoais em 2ª pessoa
      if (/\bsua dor\b/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "sua dor"');
      if (/\bseu corpo\b/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "seu corpo"');
      if (/\bsua rotina\b/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "sua rotina"');
      if (/\bseu quadro\b/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "seu quadro"');
      if (/\bsua coluna\b/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "sua coluna"');
      if (/\bseu problema\b/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "seu problema"');
      if (/\bseus sintomas\b/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "seus sintomas"');
      if (/\bsuas?\s+atividades\b/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "suas atividades"');

      // Veto a promessas absolutas
      if (/viver sem dor/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "viver sem dor"');
      if (/cura definitiva/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "cura definitiva"');
      if (/garantido/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "garantido"');
      if (/a única solução/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "a única solução"');
      if (/a principal causa/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "a principal causa"');
      if (/com certeza/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "com certeza"');

      // Veto a links de fuga
      if (/link na bio/i.test(text)) violations.push('VIOLAÇÃO: Encontrado "link na bio"');

      // Veto a travessões de IA
      if (/—|--/.test(text)) violations.push('VIOLAÇÃO: Encontrado travessão de IA');

      // Verificação da Equipe Oficial de Fisioterapeutas de Araucária
      const rawHtml = document.documentElement.outerHTML;
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

    // 8.1 Teste Interativo de Vídeos (Offset Click e Keyboard Enter)
    console.log('8.1 Testando Interatividade e Acessibilidade dos Players de Vídeo...');
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, 1650);
    });
    await new Promise(r => setTimeout(r, 100));

    // Teste de clique com mouse fora do centro (offset 80, 80)
    const founderBox = await page.evaluate(() => {
      const el = document.querySelector('#founderVideoContainer');
      const r = el.getBoundingClientRect();
      return { x: r.left + 80, y: r.top + 80 };
    });
    await page.mouse.click(founderBox.x, founderBox.y);
    await new Promise(r => setTimeout(r, 200));

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
      window.scrollTo(0, 3600);
    });
    await new Promise(r => setTimeout(r, 100));
    await page.focus('#depoimentos .testimonial-media-wrap .video-poster-overlay');
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 200));

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
