/*
 * R-Cotação Online — Compartilhamento de PNG sem texto (Safari / Chrome).
 * - Web Share API: compartilha apenas o arquivo; o usuário escolhe WhatsApp.
 * - Fallback: copia PNG e orienta a colar no WhatsApp Web; ou baixa PNG.
 * Não utiliza wa.me/?text, não envia mensagens e não altera cotações/preços.
 */
(() => {
  'use strict';
  const WEB_WHATSAPP = 'https://web.whatsapp.com/';
  let arquivoAtual = null;
  let focoAnterior = null;
  let modal = null;

  // Operação síncrona: navigator.share()/clipboard.write() recebem o arquivo
  // ainda no gesto do clique, essencial no Safari iOS e no Chrome Android.
  function pngDoCanvas(canvas) {
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    if (!base64) throw new Error('Não foi possível gerar o PNG.');
    const binario = atob(base64);
    const partes = [];
    for (let i = 0; i < binario.length; i += 16384) {
      const bloco = binario.slice(i, i + 16384);
      const bytes = new Uint8Array(bloco.length);
      for (let j = 0; j < bloco.length; j++) bytes[j] = bloco.charCodeAt(j);
      partes.push(bytes);
    }
    return new Blob(partes, { type: 'image/png' });
  }

  function baixar(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function criarModal() {
    if (modal) return modal;
    const overlay = document.createElement('div');
    overlay.id = 'resolve-share-overlay';
    overlay.className = 'resolve-share-overlay hidden';
    overlay.innerHTML = `
      <div class="resolve-share-dialog" role="dialog" aria-modal="true" aria-labelledby="resolve-share-title" aria-describedby="resolve-share-description">
        <div class="resolve-share-top">
          <div>
            <span class="resolve-share-kicker">COMPARTILHAR COTAÇÃO</span>
            <h2 id="resolve-share-title">Enviar imagem pelo WhatsApp</h2>
          </div>
          <button type="button" class="resolve-share-close" aria-label="Fechar janela de compartilhamento">×</button>
        </div>
        <p id="resolve-share-description" class="resolve-share-description"></p>
        <p class="resolve-share-help">No WhatsApp Web, abra a conversa, pressione <strong>Ctrl + V</strong> (Windows) ou <strong>⌘ + V</strong> (Mac) e confirme o envio da imagem.</p>
        <div class="resolve-share-actions">
          <button type="button" class="resolve-share-button resolve-share-primary" data-share-action="open">Abrir WhatsApp Web</button>
          <button type="button" class="resolve-share-button resolve-share-outline" data-share-action="copy">Copiar imagem PNG</button>
          <button type="button" class="resolve-share-button resolve-share-outline" data-share-action="download">Baixar imagem PNG</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.resolve-share-close').addEventListener('click', fecharModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) fecharModal(); });
    overlay.querySelector('[data-share-action="open"]').addEventListener('click', () => {
      const novaJanela = window.open(WEB_WHATSAPP, '_blank', 'noopener,noreferrer');
      if (!novaJanela) mostrarStatus('O navegador bloqueou a nova aba. Abra web.whatsapp.com manualmente.');
    });
    overlay.querySelector('[data-share-action="copy"]').addEventListener('click', () => {
      if (!arquivoAtual) return;
      // Escreve na área de transferência diretamente a partir de novo clique.
      copiar(arquivoAtual.blob).then(() => mostrarStatus('Imagem PNG copiada. Agora cole na conversa do WhatsApp.'))
        .catch(() => mostrarStatus('Não foi possível copiar neste navegador. Use Baixar imagem PNG e anexe no WhatsApp.'));
    });
    overlay.querySelector('[data-share-action="download"]').addEventListener('click', () => {
      if (arquivoAtual) baixar(arquivoAtual.blob, arquivoAtual.nome);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !overlay.classList.contains('hidden')) fecharModal();
    });
    modal = overlay;
    return modal;
  }

  function mostrarStatus(mensagem) {
    const overlay = criarModal();
    overlay.querySelector('#resolve-share-description').textContent = mensagem;
    if (overlay.classList.contains('hidden')) {
      focoAnterior = document.activeElement;
      overlay.classList.remove('hidden');
      overlay.querySelector('[data-share-action="open"]').focus();
    }
  }

  function fecharModal() {
    if (!modal) return;
    modal.classList.add('hidden');
    if (focoAnterior && focoAnterior.isConnected) focoAnterior.focus();
  }

  function copiar(blob) {
    if (!window.isSecureContext || !navigator.clipboard?.write || !window.ClipboardItem) {
      return Promise.reject(new Error('Clipboard API de imagem indisponível'));
    }
    // A chamada abaixo acontece durante o evento de clique (sem await antes).
    return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  }

  async function enviar(canvas, nome, avisar) {
    let blob;
    try {
      blob = pngDoCanvas(canvas);
    } catch (e) {
      avisar?.('Não foi possível gerar a imagem PNG neste navegador.');
      return;
    }
    arquivoAtual = {blob, nome};
    const file = new File([blob], nome, {type:'image/png', lastModified:Date.now()});

    // Somente arquivo, nunca texto, legenda, título nem URL.
    let podeCompartilharArquivo = false;
    try {
      podeCompartilharArquivo = typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files:[file] });
    } catch (_) { /* Sem suporte nativo para arquivos. */ }

    if (podeCompartilharArquivo) {
      try {
        // Importante: invocar ANTES de qualquer await (exigência de gesto do usuário).
        await navigator.share({ files:[file] });
        avisar?.('Imagem compartilhada com o aplicativo escolhido. Conclua o envio no WhatsApp.');
        return;
      } catch (e) {
        if (e?.name === 'AbortError') {
          // Se o WhatsApp não estiver entre os apps do seletor, a pessoa
          // ainda pode usar o WhatsApp Web por cópia ou download de PNG.
          mostrarStatus('Compartilhamento cancelado. Se o WhatsApp não apareceu como opção, copie ou baixe o PNG e envie pelo WhatsApp Web.');
          return;
        }
        // Para NotAllowedError/TypeError/outros, segue ao método alternativo.
      }
    }

    // WhatsApp Web não tem API de anexos automáticos a partir de sites externos.
    // O usuário mantém controle sobre a conversa e confirma o envio.
    try {
      const tentativaDeCopia = copiar(blob); // A execução é iniciada imediatamente.
      await tentativaDeCopia;
      mostrarStatus('Imagem PNG copiada! Abra o WhatsApp Web, escolha a conversa, cole a imagem e envie. Não foi criada nenhuma mensagem de texto.');
    } catch (_) {
      mostrarStatus('Este navegador não permitiu copiar o PNG automaticamente. Você pode tentar novamente ou baixar a imagem e anexá-la no WhatsApp Web.');
    }
  }

  window.ResolveCompartilhamento = Object.freeze({enviar});
})();
