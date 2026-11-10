(() => {
  'use strict';
  const dados = window.RESOLVE_DADOS;
  const tabelas = window.RESOLVE_PRECOS?.valores ?? {};
  const $ = id => document.getElementById(id);
  const el = {
    contrato: $('contrato'), plano: $('plano'), nascimento: $('nascimento'), idade: $('idade'),
    nascimentoField: $('nascimentoField'), idadeField: $('idadeField'), ageResult: $('ageResult'),
    vendedor: $('vendedor'), vendedorFields: $('vendedorFields'), nomeBeneficiario: $('nomeBeneficiario'),
    sellerWhats: $('sellerWhats'), sellerWhatsRow: $('sellerWhatsRow'), sellerEmail: $('sellerEmail'),
    infoPrestadora: $('infoPrestadora'), infoAcomodacao: $('infoAcomodacao'),
    infoAbrangencia: $('infoAbrangencia'), infoCoparticipacao: $('infoCoparticipacao'),
    infoMensalidade: $('infoMensalidade'), validationMessage: $('validationMessage'),
    downloadButton: $('downloadButton'), shareButton: $('shareButton'),
    canvas: $('cotacaoCanvas'), toast: $('toast')
  };
  const ctx = el.canvas.getContext('2d');
  const T = { cyan:'#12a8c1', lime:'#c4d934', ink:'#153746', muted:'#667a85', paper:'#f2fafb', green:'#079566', white:'#fff' };
  const faixas = [
    { inicio:0, fim:18, chave:'0-18', texto:'0 A 18 ANOS' },
    { inicio:19, fim:23, chave:'19-23', texto:'19 A 23 ANOS' },
    { inicio:24, fim:28, chave:'24-28', texto:'24 A 28 ANOS' },
    { inicio:29, fim:33, chave:'29-33', texto:'29 A 33 ANOS' },
    { inicio:34, fim:38, chave:'34-38', texto:'34 A 38 ANOS' },
    { inicio:39, fim:43, chave:'39-43', texto:'39 A 43 ANOS' },
    { inicio:44, fim:48, chave:'44-48', texto:'44 A 48 ANOS' },
    { inicio:49, fim:53, chave:'49-53', texto:'49 A 53 ANOS' },
    { inicio:54, fim:58, chave:'54-58', texto:'54 A 58 ANOS' },
    { inicio:59, fim:120, chave:'59+', texto:'59 ANOS OU MAIS' }
  ];
  const money = valor => new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(valor);
  const brand = new Image();
  const operadoras = new Image();
  const whatsappIcon = new Image();
  brand.onload = atualizar; brand.src = 'assets/logo-resolve.png';
  operadoras.onload = atualizar; operadoras.src = 'assets/operadoras.png';
  whatsappIcon.onload = atualizar; whatsappIcon.src = 'assets/whatsapp.png';
  let toastTimeout;

  function preencherSelect(select, items, prompt, value, label) {
    select.replaceChildren(new Option(prompt, ''));
    items.forEach(item => select.add(new Option(item[label], item[value])));
  }
  function montarContratos() {
    preencherSelect(el.contrato,dados.contratos,'Selecione um contrato','id','nome');
    el.contrato.value = ''; // Contrato sempre exige seleção explícita
    montarPlanos();
  }
  function montarPlanos() {
    const contrato = contratoAtual();
    preencherSelect(el.plano, contrato?.planos ?? [], 'Selecione um plano','id','nome');
    el.plano.value = ''; // Evita seleção involuntária de plano
    atualizar();
  }
  function montarVendedores() {
    preencherSelect(el.vendedor,dados.vendedores,'Selecione um vendedor','id','nome');
    el.vendedor.value = ''; // Seleção sempre feita pelo vendedor
    atualizarVendedor();
  }
  function contratoAtual() { return dados.contratos.find(c=>c.id===el.contrato.value) ?? null; }
  function planoAtual() { return contratoAtual()?.planos.find(p=>p.id===el.plano.value) ?? null; }
  function modoIdade() { return document.querySelector('input[name="modoIdade"]:checked')?.value ?? 'nascimento'; }
  function idadeAtual() {
    if(modoIdade()==='idade') {
      const raw=el.idade.value.trim();
      if(!raw || !/^\d+$/.test(raw)) return null;
      const n=Number(raw);
      return n>=0 && n<=120 ? n : null;
    }
    const raw=el.nascimento.value;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    const [ano,mes,dia]=raw.split('-').map(Number);
    const nascimento = new Date(ano,mes-1,dia);
    if(nascimento.getFullYear()!==ano || nascimento.getMonth()!==mes-1 || nascimento.getDate()!==dia) return null;
    const hoje=new Date();
    if(nascimento>hoje) return null;
    let idade=hoje.getFullYear()-ano;
    if(hoje.getMonth()+1<mes || (hoje.getMonth()+1===mes && hoje.getDate()<dia)) idade--;
    return idade>=0 && idade<=120 ? idade : null;
  }
  function vendedorAtual() { return dados.vendedores.find(v=>v.id===el.vendedor.value) ?? null; }
  function obterCotacao() {
    const contrato=contratoAtual(),plano=planoAtual(),idade=idadeAtual(),vendedor=vendedorAtual();
    const faixa=idade===null ? null : faixas.find(f=>idade>=f.inicio && idade<=f.fim)??null;
    // Busca exclusivamente a tabela do contrato selecionado (inclusive modalidades A/F/I/E).
    // Jamais herdar preço de outro contrato ou aplicar novo reajuste.
    const encontrado=faixa && plano && contrato ? tabelas[contrato.id]?.[plano.id]?.[faixa.chave] : undefined;
    const preco=typeof encontrado==='number' && Number.isFinite(encontrado) && encontrado>0 ? encontrado : null;
    return {contrato,plano,idade,faixa,preco,vendedor,nomeBeneficiario:el.nomeBeneficiario.value.trim().toLocaleUpperCase('pt-BR')};
  }
  function testeDados(q) {
    if(!q.contrato) return 'Selecione o contrato.';
    if(!q.plano) return 'Selecione o plano.';
    if(q.idade===null || !q.faixa) return 'Informe uma idade ou data de nascimento válida.';
    if(!q.plano.acomodacao || !q.plano.abrangencia || typeof q.plano.coparticipacao!=='boolean') return 'Os detalhes deste plano ainda não foram cadastrados.';
    if(q.preco===null) return 'Ainda não há mensalidade cadastrada para esta combinação de contrato, plano e faixa etária.';
    if(!q.vendedor?.nome || !q.vendedor.email) return 'Selecione um vendedor com nome e e-mail cadastrados.';
    if(!/^\S+@\S+\.\S+$/.test(q.vendedor.email)) return 'O e-mail do vendedor não é válido.';
    if(q.vendedor.whatsapp && q.vendedor.whatsapp.replace(/\D/g,'').length<10) return 'O WhatsApp do vendedor não é válido.';
    return '';
  }
  function mostrarToast(mensagem) {
    el.toast.textContent=mensagem;
    el.toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout=setTimeout(()=>el.toast.classList.remove('show'),6500);
  }
  function atualizarVendedor() {
    const vendedor=vendedorAtual();
    el.vendedorFields.classList.toggle('hidden',!vendedor);
    el.sellerWhatsRow.classList.toggle('hidden',!vendedor?.whatsapp);
    el.sellerWhats.textContent=vendedor?.whatsapp || '';
    el.sellerEmail.textContent=vendedor?.email || '';
    atualizar();
  }
  function atualizar() {
    const q=obterCotacao();
    el.infoPrestadora.textContent=q.plano?.prestadora||'—';
    el.infoAcomodacao.textContent=q.plano?.acomodacao||'A cadastrar';
    el.infoAbrangencia.textContent=q.plano?.abrangencia||'A cadastrar';
    el.infoCoparticipacao.textContent=q.plano ? (q.plano.coparticipacao===null?'A cadastrar':q.plano.coparticipacao?'Possui':'Não possui') : '—';
    el.infoMensalidade.textContent=q.preco===null ? (q.plano && q.faixa ? 'Sem valor cadastrado' : 'A definir') : money(q.preco);
    el.plano.title = q.plano?.restricaoMovimentacaoOrigem ? 'Na R-Proposta, este plano depende da movimentação: RN ou inclusão de dependente.' : ''; 
    el.ageResult.textContent=q.faixa ? `Idade: ${q.idade} ano${q.idade===1?'':'s'} · Faixa etária: ${q.faixa.texto.toLowerCase()}` : 'Informe uma idade ou data de nascimento válida para identificar a faixa etária.';
    const erro=testeDados(q);
    el.validationMessage.textContent=erro || 'Tudo pronto para gerar a imagem.';
    el.validationMessage.style.color=erro ? '#a35a23' : '#078660';
    el.downloadButton.disabled=!!erro;
    el.shareButton.disabled=!!erro;
    desenharCotacao(q);
  }
  function retangulo(x,y,w,h,fill) {ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);}
  function arredondar(x,y,w,h,r,fill,stroke) {
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
  }
  function texto(conteudo,x,y,tamanho,cor,peso='400',maxWidth=null,align='left') {
    ctx.textAlign=align;ctx.textBaseline='alphabetic';
    const face='Arial, Helvetica, sans-serif';
    ctx.font=`${peso} ${tamanho}px ${face}`;
    if(maxWidth) {
      while(ctx.measureText(conteudo).width>maxWidth && tamanho>14) {tamanho-=1;ctx.font=`${peso} ${tamanho}px ${face}`;}
    }
    ctx.fillStyle=cor;ctx.fillText(conteudo,x,y);
    ctx.textAlign='left';
  }
  function cartao(x,y,w,h,r=17,fill='#fff') {
    ctx.save();ctx.shadowColor='rgba(34,64,76,.20)';ctx.shadowBlur=10;ctx.shadowOffsetY=5;
    arredondar(x,y,w,h,r,fill);ctx.restore();
  }
  function linhaDetalhe(y,rotulo,valor) {
    cartao(77,y,1046,94,14);
    texto(rotulo,117,y+57,25,T.muted,'bold');
    texto(valor||'A confirmar',430,y+57,27,T.ink,'bold',650);
  }
  function desenharCotacao(q) {
    const W=1200,H=1500;
    ctx.clearRect(0,0,W,H);
    retangulo(0,0,W,H,T.paper);
    // Cabeçalho da proposta: mesma paleta do PowerPoint original.
    retangulo(0,0,W,257,T.cyan);
    if(brand.complete && brand.naturalWidth) ctx.drawImage(brand,72,52,356,157);
    else texto('resolve SAÚDE',75,145,55,T.white,'bold');
    cartao(667,46,472,155,25,'#fff');
    if(operadoras.complete && operadoras.naturalWidth) ctx.drawImage(operadoras,704,75,398,96);
    else texto('UNIMED   ·   INTERMED',713,138,32,T.green,'bold');
    ctx.save();ctx.shadowColor='#123b422b';ctx.shadowBlur=6;ctx.shadowOffsetY=4;retangulo(0,257,W,4,'#dce4e6');ctx.restore();

    const plano=q.plano?.nome ?? 'SELECIONE O PLANO';
    const prestadora=q.plano?.prestadora ?? 'PRESTADORA';
    const cop = q.plano?.coparticipacao===true ? 'COM COPARTICIPAÇÃO' : q.plano?.coparticipacao===false ? 'SEM COPARTICIPAÇÃO' : 'COPARTICIPAÇÃO A CONFIRMAR';
    texto('COTAÇÃO DE PLANO DE SAÚDE',77,333,30,T.cyan,'bold');
    texto(plano.toUpperCase(),77,430,74,T.ink,'bold',1040);
    texto(`${prestadora}  •  ${cop}`,80,488,30,T.green,'bold',1030);

    cartao(68,546,1064,330,45,'#fff');
    arredondar(68,546,1064,330,45,null,'#d9e9ed');
    texto(`MENSALIDADE  •  FAIXA ETÁRIA ${q.faixa?.texto ?? 'A DEFINIR'}`,115,618,24,T.muted,'bold',985);
    texto(q.preco===null?'VALOR A DEFINIR':money(q.preco),113,735,80,T.cyan,'bold',990);
    texto(q.preco===null?'Não há valor de venda cadastrado para esta combinação':'Valor mensal informado para esta faixa etária',117,797,22,T.muted,'400',975);
    if(q.nomeBeneficiario) texto(`BENEFICIÁRIO (A): ${q.nomeBeneficiario}`,117,847,22,T.ink,'bold',975);

    texto('DETALHES DO PLANO',79,933,30,T.ink,'bold');
    linhaDetalhe(957,'Acomodação',q.plano?.acomodacao);
    linhaDetalhe(1065,'Abrangência',q.plano?.abrangencia);
    linhaDetalhe(1173,'Coparticipação',q.plano?.coparticipacao===null?'A confirmar':q.plano?.coparticipacao?'Possui':'Não possui');

    cartao(77,1290,1046,65,11,T.lime);
    texto(q.plano?.demonstrativo?'COTAÇÃO DEMONSTRATIVA':'OFERTA POR TEMPO LIMITADO',600,1333,26,T.ink,'bold',980,'center');

    const seller=q.vendedor;
    const sellerName=seller?.nome || 'Vendedor a definir';
    const sellerWhatsapp=seller?.whatsapp || '';
    const sellerEmail=seller?.email || 'E-mail a definir';
    texto('SEU CONTATO NA RESOLVE SAÚDE',79,1390,19,T.muted,'bold');
    // Data é calculada no navegador no instante da geração; o contrato não é desenhado.
    const dataEmissao=new Intl.DateTimeFormat('pt-BR').format(new Date());
    texto(`Cotação emitida em ${dataEmissao}`,1122,1390,19,T.muted,'bold',390,'right');
    const sellerLine=sellerWhatsapp ? `${sellerName}  •  ${sellerWhatsapp}` : sellerName;
    // O ícone verde do WhatsApp vem DEPOIS do número, nunca antes dele.
    // A posição é medida com a fonte efetivamente usada para o texto.
    const iconSize=31, iconGap=13;
    let sellerFontSize=27;
    ctx.font=`bold ${sellerFontSize}px Arial, Helvetica, sans-serif`;
    const availableWidth=1030-(sellerWhatsapp?iconSize+iconGap:0);
    while(ctx.measureText(sellerLine).width>availableWidth && sellerFontSize>14) {
      sellerFontSize--;
      ctx.font=`bold ${sellerFontSize}px Arial, Helvetica, sans-serif`;
    }
    const sellerLineWidth=ctx.measureText(sellerLine).width;
    texto(sellerLine,79,1425,sellerFontSize,T.ink,'bold');
    if(sellerWhatsapp && whatsappIcon.complete && whatsappIcon.naturalWidth) {
      ctx.drawImage(whatsappIcon,79+sellerLineWidth+iconGap,1398,iconSize,iconSize);
    }
    texto(sellerEmail,79,1454,22,T.muted,'400',1030);
    texto('Valores sujeitos a alterações conforme tabela vigente.',79,1480,17,T.muted,'400',1030);
    retangulo(0,1490,W,10,T.cyan);
  }
  function gerarBlob() {return new Promise((resolve,reject)=>el.canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Não foi possível gerar PNG')),'image/png'));}
  function nomeArquivo(q) {
    const slug=(q.plano?.nome||'plano').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase();
    return `cotacao-resolve-${slug}-${q.faixa?.chave||'sem-idade'}.png`;
  }
  function baixarBlob(blob,nome) {
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download=nome;document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60_000);
  }
  async function baixar() {
    const q=obterCotacao(); if(testeDados(q)) return;
    try {
      desenharCotacao(q);
      const blob=await gerarBlob();baixarBlob(blob,nomeArquivo(q));mostrarToast('Imagem PNG gerada com sucesso.');
    }catch(e){mostrarToast('Não foi possível baixar a imagem neste navegador.');}
  }
  async function compartilharWhatsApp() {
    const q=obterCotacao();if(testeDados(q)) return;
    const cliente=q.nomeBeneficiario?` para ${q.nomeBeneficiario}`:'';
    const textoWhats=`Olá! Segue a cotação${cliente} do plano ${q.plano.nome}, faixa etária ${q.faixa.texto.toLowerCase()}, mensalidade ${money(q.preco)}. Resolve Saúde.`;
    const urlWhats=`https://wa.me/?text=${encodeURIComponent(textoWhats)}`;
    // Abre apenas WhatsApp / WhatsApp Web, sem apresentar apps de terceiros.
    // Navegadores não oferecem API para anexar PNG diretamente ao WhatsApp Web.
    const janela=window.open(urlWhats,'_blank','noopener,noreferrer');
    try {
      desenharCotacao(q);
      const blob=await gerarBlob();
      let copiado=false;
      try {
        if(navigator.clipboard && window.ClipboardItem && window.isSecureContext) {
          await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
          copiado=true;
        }
      } catch(e) {copiado=false;}
      if(copiado) mostrarToast('WhatsApp aberto. Cole a imagem na conversa e envie.');
      else {baixarBlob(blob,nomeArquivo(q));mostrarToast('WhatsApp aberto. PNG baixado: anexe o arquivo na conversa para enviar.');}
      // Alguns navegadores móveis bloqueiam novas abas; evita prometer envio direto.
      if(!janela) mostrarToast('Se o WhatsApp não abriu, permita novas abas e tente novamente. A imagem foi preparada.');
    } catch(e) {mostrarToast('Não foi possível preparar a imagem para o WhatsApp.');}
  }

  // Eventos de formulário.
  el.contrato.addEventListener('change',montarPlanos);
  el.plano.addEventListener('change',atualizar);
  document.querySelectorAll('input[name="modoIdade"]').forEach(r=>r.addEventListener('change',()=>{
    const nascimento=modoIdade()==='nascimento';
    el.nascimentoField.classList.toggle('hidden',!nascimento);
    el.idadeField.classList.toggle('hidden',nascimento);
    atualizar();
  }));
  [el.nascimento,el.idade].forEach(c=>c.addEventListener('input',atualizar));
  el.nomeBeneficiario.addEventListener('input',()=>{
    const original=el.nomeBeneficiario.value;
    const maiusculo=original.toLocaleUpperCase('pt-BR');
    if(original!==maiusculo) {
      const inicio=el.nomeBeneficiario.selectionStart, fim=el.nomeBeneficiario.selectionEnd;
      el.nomeBeneficiario.value=maiusculo;
      if(inicio!==null && fim!==null) el.nomeBeneficiario.setSelectionRange(inicio,fim);
    }
    atualizar();
  });
  el.vendedor.addEventListener('change',atualizarVendedor);
  el.downloadButton.addEventListener('click',baixar);
  el.shareButton.addEventListener('click',compartilharWhatsApp);
  $('quoteForm').addEventListener('submit',e=>e.preventDefault());
  // Formulário inicia vazio; o preenchimento é intencional.
  montarContratos();montarVendedores();atualizar();
  if(document.fonts?.ready) document.fonts.ready.then(atualizar);
})();
