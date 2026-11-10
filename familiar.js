(() => {
  'use strict';
  const dados = window.RESOLVE_DADOS;
  const tabelas = window.RESOLVE_PRECOS?.valores ?? {};
  const $ = id => document.getElementById(id);
  const fields = {
    individualTab: $('tab-individual'), familyTab: $('tab-familiar'),
    individualWorkspace: $('workspaceIndividual'), familyWorkspace: $('workspaceFamiliar'),
    contract: $('familyContrato'), plan: $('familyPlano'), people: $('familyPeople'),
    count: $('familyCount'), add: $('familyAdd'),
    prestadora: $('familyPrestadora'), acomodacao: $('familyAcomodacao'),
    abrangencia: $('familyAbrangencia'), coparticipacao: $('familyCoparticipacao'),
    total: $('familyTotal'), vendedor: $('familyVendedor'), sellerPanel: $('familySellerPanel'),
    whatsRow: $('familyWhatsRow'), whats: $('familyWhats'), email: $('familyEmail'),
    validation: $('familyValidation'), download: $('familyDownload'), share: $('familyShare'),
    canvas: $('familyCanvas'), toast: $('toast')
  };
  if (!dados || !fields.canvas) return;
  const ctx = fields.canvas.getContext('2d');
  const T = {cyan:'#12a8c1', lime:'#c4d934', ink:'#153746', muted:'#667a85', paper:'#f2fafb', green:'#079566'};
  const faixas = [
    {min:0,max:18,key:'0-18',text:'0 A 18 ANOS'},
    {min:19,max:23,key:'19-23',text:'19 A 23 ANOS'},
    {min:24,max:28,key:'24-28',text:'24 A 28 ANOS'},
    {min:29,max:33,key:'29-33',text:'29 A 33 ANOS'},
    {min:34,max:38,key:'34-38',text:'34 A 38 ANOS'},
    {min:39,max:43,key:'39-43',text:'39 A 43 ANOS'},
    {min:44,max:48,key:'44-48',text:'44 A 48 ANOS'},
    {min:49,max:53,key:'49-53',text:'49 A 53 ANOS'},
    {min:54,max:58,key:'54-58',text:'54 A 58 ANOS'},
    {min:59,max:120,key:'59+',text:'59 ANOS OU MAIS'}
  ];
  const fmt = v => new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(v);
  const sellerPic = new Image(), operatorsPic = new Image(), whatsappPic = new Image();
  let active = false;
  [sellerPic,operatorsPic,whatsappPic].forEach(img => img.addEventListener('load',()=>{if(active) paint(getQuote());}));
  sellerPic.src='assets/logo-resolve.png';
  operatorsPic.src='assets/operadoras.png';
  whatsappPic.src='assets/whatsapp.png';
  let sequence=0;
  const people = [newPerson(),newPerson()];
  let toastTimer;

  function newPerson(){return {id:++sequence, name:'', mode:'nascimento', birth:'', age:''};}
  function escapeHtml(text) {return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function fillSelect(el,items,label='nome'){
    el.replaceChildren(new Option(el===fields.contract?'Selecione um contrato':el===fields.plan?'Selecione um plano':'Selecione um vendedor',''));
    items.forEach(item=>el.add(new Option(item[label],item.id)));
    el.value='';
  }
  function contractNow(){return dados.contratos.find(c=>c.id===fields.contract.value)||null;}
  function planNow(){return contractNow()?.planos.find(p=>p.id===fields.plan.value)||null;}
  function sellerNow(){return dados.vendedores.find(v=>v.id===fields.vendedor.value)||null;}
  function ageOf(p){
    if (p.mode==='idade') {
      if (!/^\d+$/.test(p.age)) return null;
      const n=Number(p.age);return Number.isInteger(n)&&n>=0&&n<=120?n:null;
    }
    if(!/^\d{4}-\d{2}-\d{2}$/.test(p.birth)) return null;
    const [y,m,d]=p.birth.split('-').map(Number);
    const dt=new Date(y,m-1,d);
    if(dt.getFullYear()!==y||dt.getMonth()!==m-1||dt.getDate()!==d) return null;
    const today=new Date();
    if(dt>today) return null;
    let n=today.getFullYear()-y;
    if(today.getMonth()+1<m || (today.getMonth()+1===m&&today.getDate()<d)) n--;
    return n>=0&&n<=120?n:null;
  }
  function getQuote(){
    const contract=contractNow(), plan=planNow(), seller=sellerNow();
    const members=people.map(p=>{
      const age=ageOf(p);
      const bracket=age===null?null:faixas.find(f=>age>=f.min&&age<=f.max)??null;
      // Não permite usar preços de outros contratos, modalidades ou faixas etárias.
      const raw=contract&&plan&&bracket?tabelas[contract.id]?.[plan.id]?.[bracket.key]:undefined;
      const price=typeof raw==='number'&&Number.isFinite(raw)&&raw>0?raw:null;
      return {id:p.id,name:p.name.trim().toLocaleUpperCase('pt-BR'), age, bracket, price};
    });
    return {contract,plan,seller,members,total:members.every(m=>m.price!==null)?Math.round(members.reduce((a,m)=>a+m.price,0)*100)/100:null};
  }
  function validate(q){
    if(!q.contract) return 'Selecione o contrato.';
    if(!q.plan) return 'Selecione o plano.';
    if(!q.plan.acomodacao || !q.plan.abrangencia || typeof q.plan.coparticipacao!=='boolean') return 'Faltam informações de acomodação, abrangência ou coparticipação deste plano.';
    if(q.members.length<2) return 'Inclua pelo menos dois beneficiários.';
    for(let i=0;i<q.members.length;i++){
      const m=q.members[i];
      if(!m.name) return `Informe o nome do beneficiário ${i+1}.`;
      if(m.age===null || !m.bracket) return `Informe uma idade ou data de nascimento válida para o beneficiário ${i+1}.`;
      if(m.price===null) return `Não há valor cadastrado na tabela para o beneficiário ${i+1} (${m.bracket.text.toLowerCase()}).`;
    }
    if(!q.seller?.nome || !/^\S+@\S+\.\S+$/.test(q.seller.email||'')) return 'Selecione um vendedor com e-mail válido.';
    if(q.seller.whatsapp && q.seller.whatsapp.replace(/\D/g,'').length<10) return 'O WhatsApp do vendedor selecionado não é válido.';
    return '';
  }
  function personMarkup(p,index){
    const modeBirth=p.mode==='nascimento';
    return `<article class="family-person" data-person-id="${p.id}">
      <div class="family-person-head"><strong>Beneficiário ${index+1}</strong><button type="button" class="family-remove" data-remove="${p.id}" ${people.length<=2?'disabled':''} title="Remover beneficiário ${index+1}">Remover</button></div>
      <div class="field-group"><label for="family-name-${p.id}">Nome do beneficiário <span class="required">*</span></label><input id="family-name-${p.id}" type="text" data-id="${p.id}" data-field="name" maxlength="75" placeholder="Ex.: JOÃO GONÇALVES" value="${escapeHtml(p.name)}" autocomplete="off" autocapitalize="characters" spellcheck="false"/></div>
      <div class="field-group"><label>Como informar a idade? <span class="required">*</span></label><div class="segmented" role="radiogroup" aria-label="Tipo de idade do beneficiário ${index+1}">
       <label class="seg-option"><input type="radio" name="family-mode-${p.id}" data-id="${p.id}" data-field="mode" value="nascimento" ${modeBirth?'checked':''}/> <span>Data de nascimento</span></label>
       <label class="seg-option"><input type="radio" name="family-mode-${p.id}" data-id="${p.id}" data-field="mode" value="idade" ${!modeBirth?'checked':''}/> <span>Idade</span></label></div></div>
      <div class="age-field ${modeBirth?'':'hidden'}"><label for="family-birth-${p.id}" class="secondary-label">Data de nascimento</label><input id="family-birth-${p.id}" type="date" data-id="${p.id}" data-field="birth" value="${escapeHtml(p.birth)}"/></div>
      <div class="age-field ${modeBirth?'hidden':''}"><label for="family-age-${p.id}" class="secondary-label">Idade em anos</label><input id="family-age-${p.id}" type="number" data-id="${p.id}" data-field="age" value="${escapeHtml(p.age)}" min="0" max="120" step="1" inputmode="numeric" placeholder="Ex.: 35"/></div>
      <p class="family-line" data-summary="${p.id}">Informe a idade para calcular a mensalidade.</p>
    </article>`;
  }
  function renderPeople(){
    fields.people.innerHTML=people.map(personMarkup).join('');
    fields.count.textContent=`${people.length} beneficiários`;
    fields.add.disabled=people.length>=30;
    update();
  }
  function updatePerson(id,field,value){
    const member=people.find(p=>p.id===id);if(!member) return;
    member[field]=value;
    if(field==='mode'){
      const box=fields.people.querySelector(`[data-person-id="${id}"]`);
      if(box){box.querySelectorAll('.age-field').forEach((el,i)=>el.classList.toggle('hidden', i===(value==='nascimento'?1:0)));}
    }
    update();
  }
  function toast(text){
    fields.toast.textContent=text;fields.toast.classList.add('show');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>fields.toast.classList.remove('show'),6200);
  }
  function update(){
    const q=getQuote();
    fields.prestadora.textContent=q.plan?.prestadora||'—';
    fields.acomodacao.textContent=q.plan?.acomodacao||'—';
    fields.abrangencia.textContent=q.plan?.abrangencia||'—';
    fields.coparticipacao.textContent=q.plan?(q.plan.coparticipacao?'Possui':'Não possui'):'—';
    fields.total.textContent=q.total===null?'A definir':fmt(q.total);
    fields.sellerPanel.classList.toggle('hidden',!q.seller);
    fields.whatsRow.classList.toggle('hidden',!q.seller?.whatsapp);
    fields.whats.textContent=q.seller?.whatsapp||'';
    fields.email.textContent=q.seller?.email||'';
    q.members.forEach(m=>{
      const el=fields.people.querySelector(`[data-summary="${m.id}"]`);if(!el) return;
      el.textContent=m.bracket?`Faixa ${m.bracket.text.toLowerCase()} · ${m.price===null?'Sem mensalidade cadastrada':fmt(m.price)}`:'Informe a idade para calcular a mensalidade.';
    });
    const error=validate(q);
    fields.validation.textContent=error||'Tudo pronto para gerar a cotação familiar.';
    fields.validation.style.color=error?'#a35a23':'#078660';
    fields.download.disabled=Boolean(error);
    fields.share.disabled=Boolean(error);
    if(active) paint(q);
  }
  function showTab(family){
    active=family;
    fields.individualTab.classList.toggle('selected',!family);
    fields.familyTab.classList.toggle('selected',family);
    fields.individualTab.setAttribute('aria-selected',String(!family));
    fields.familyTab.setAttribute('aria-selected',String(family));
    fields.individualWorkspace.classList.toggle('hidden',family);
    fields.familyWorkspace.classList.toggle('hidden',!family);
    if(family){update();} else { /* individual unchanged, same form and canvas */ }
  }
  // --- Desenho PNG familiar: cabeçalho e rodapé visualmente iguais ao da cotação individual. ---
  function rect(x,y,w,h,fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);}
  function rounded(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
  function card(x,y,w,h,r=15,fill='#fff'){
    ctx.save();ctx.shadowColor='rgba(34,64,76,.20)';ctx.shadowBlur=10;ctx.shadowOffsetY=5;
    rounded(x,y,w,h,r,fill);ctx.restore();
  }
  function text(s,x,y,size,color,weight='400',maxW=null,align='left'){
    s=String(s);ctx.textAlign=align;ctx.textBaseline='alphabetic';
    ctx.font=`${weight} ${size}px Arial, Helvetica, sans-serif`;
    if(maxW) while(ctx.measureText(s).width>maxW&&size>14){size-=1;ctx.font=`${weight} ${size}px Arial, Helvetica, sans-serif`;}
    ctx.fillStyle=color;ctx.fillText(s,x,y);ctx.textAlign='left';
  }
  function paint(q){
    const n=q.members.length;
    const tableTop=790, headerH=64, rowH=79;
    const tableEnd=tableTop+headerH+n*rowH;
    const totalY=tableEnd+21;
    const footerY=Math.max(1235,totalY+106);
    const H=footerY+210,W=1200;
    if(fields.canvas.width!==W||fields.canvas.height!==H){fields.canvas.width=W;fields.canvas.height=H;}
    ctx.clearRect(0,0,W,H);
    rect(0,0,W,H,T.paper);
    // Idêntico ao cabeçalho da cotação individual.
    rect(0,0,W,257,T.cyan);
    if(sellerPic.complete&&sellerPic.naturalWidth)ctx.drawImage(sellerPic,72,52,356,157);
    else text('resolve SAÚDE',75,145,55,'#fff','bold');
    card(667,46,472,155,25);
    if(operatorsPic.complete&&operatorsPic.naturalWidth)ctx.drawImage(operatorsPic,704,75,398,96);
    else text('UNIMED   ·   INTERMED',713,138,32,T.green,'bold');
    ctx.save();ctx.shadowColor='#123b422b';ctx.shadowBlur=6;ctx.shadowOffsetY=4;rect(0,257,W,4,'#dce4e6');ctx.restore();

    const plan=q.plan?.nome||'SELECIONE O PLANO';
    const prest=q.plan?.prestadora||'PRESTADORA';
    const cop=q.plan?(q.plan.coparticipacao?'COM COPARTICIPAÇÃO':'SEM COPARTICIPAÇÃO'):'COPARTICIPAÇÃO A CONFIRMAR';
    text('COTAÇÃO DE PLANO DE SAÚDE',77,333,30,T.cyan,'bold');
    text(plan.toUpperCase(),77,430,74,T.ink,'bold',1040);
    text(`${prest}  •  ${cop}`,80,488,30,T.green,'bold',1030);

    // Aqui fica a faixa horizontal de detalhes, no lugar do campo CLIENTE do modelo.
    const yInfo=532, infoH=145, gap=14, cardW=(1046-2*gap)/3;
    [
      ['ACOMODAÇÃO',q.plan?.acomodacao||'A definir'],
      ['ABRANGÊNCIA',q.plan?.abrangencia||'A definir'],
      ['COPARTICIPAÇÃO',q.plan?(q.plan.coparticipacao?'Possui':'Não possui'):'A definir']
    ].forEach(([label,value],i)=>{
      const x=77+i*(cardW+gap);
      card(x,yInfo,cardW,infoH,16);
      text(label,x+22,yInfo+48,20,T.muted,'bold',cardW-42);
      text(value,x+22,yInfo+102,28,T.ink,'bold',cardW-42);
    });

    text('COMPOSIÇÃO FAMILIAR',77,734,30,T.ink,'bold');
    text('Mensalidade individual conforme a faixa etária de cada beneficiário.',78,761,19,T.muted,'400',1040);
    const x0=55,x1=141,x2=674,x3=907,x4=1145;
    rounded(x0,tableTop,x4-x0,headerH,8,T.cyan);
    text('Nº',98,tableTop+42,21,'#fff','bold',null,'center');
    text('BENEFICIÁRIO',x1+22,tableTop+42,21,'#fff','bold');
    text('FAIXA ETÁRIA',x2+(x3-x2)/2,tableTop+42,20,'#fff','bold',x3-x2-24,'center');
    text('MENSALIDADE',x3+(x4-x3)/2,tableTop+42,20,'#fff','bold',x4-x3-24,'center');
    for(let i=0;i<n;i++){
      const m=q.members[i];
      const y=tableTop+headerH+5+i*rowH;
      const h=rowH-8;
      [[x0,x1-x0],[x1+3,x2-x1-3],[x2+3,x3-x2-3],[x3+3,x4-x3-3]].forEach(([x,w])=>card(x,y,w,h,10));
      text(String(i+1),x0+(x1-x0)/2,y+45,24,T.ink,'bold',null,'center');
      text(m.name||`BENEFICIÁRIO ${i+1}`,x1+21,y+45,25,T.ink,'bold',x2-x1-45);
      text(m.bracket?.text||'IDADE A DEFINIR',x2+(x3-x2)/2,y+45,22,T.muted,'bold',x3-x2-30,'center');
      text(m.price===null?'A definir':fmt(m.price),x3+(x4-x3)/2,y+45,23,T.ink,'bold',x4-x3-30,'center');
    }
    card(55,totalY,1090,89,15);
    text('VALOR TOTAL MENSAL',87,totalY+55,27,T.ink,'bold',630);
    text(q.total===null?'A definir':fmt(q.total),1115,totalY+55,39,T.cyan,'bold',440,'right');

    // Rodapé idêntico ao individual, variando apenas o deslocamento vertical.
    card(77,footerY,1046,65,11,T.lime);
    text(q.plan?.demonstrativo?'COTAÇÃO DEMONSTRATIVA':'OFERTA POR TEMPO LIMITADO',600,footerY+43,26,T.ink,'bold',980,'center');
    const seller=q.seller;
    const name=seller?.nome||'Vendedor a definir';
    const whatsapp=seller?.whatsapp||'';
    const email=seller?.email||'E-mail a definir';
    text('SEU CONTATO NA RESOLVE SAÚDE',79,footerY+100,19,T.muted,'bold');
    const issueDate=new Intl.DateTimeFormat('pt-BR').format(new Date());
    text(`Cotação emitida em ${issueDate}`,1122,footerY+100,19,T.muted,'bold',390,'right');
    const sellerLine=whatsapp?`${name}  •  ${whatsapp}`:name;
    const iconSize=31,iconGap=13;
    let fontSize=27;
    ctx.font=`bold ${fontSize}px Arial, Helvetica, sans-serif`;
    const maxWidth=1030-(whatsapp?iconSize+iconGap:0);
    while(ctx.measureText(sellerLine).width>maxWidth&&fontSize>14){fontSize--;ctx.font=`bold ${fontSize}px Arial, Helvetica, sans-serif`;}
    const lineWidth=ctx.measureText(sellerLine).width;
    text(sellerLine,79,footerY+135,fontSize,T.ink,'bold');
    if(whatsapp && whatsappPic.complete&&whatsappPic.naturalWidth)ctx.drawImage(whatsappPic,79+lineWidth+iconGap,footerY+108,iconSize,iconSize);
    text(email,79,footerY+164,22,T.muted,'400',1030);
    text('Valores sujeitos a alterações conforme tabela vigente.',79,footerY+190,17,T.muted,'400',1030);
    rect(0,H-10,W,10,T.cyan);
  }
  function getBlob(){return new Promise((resolve,reject)=>fields.canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG indisponível')),'image/png'));}
  function fileName(q){
    const slug=(q.plan?.nome||'plano').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase();
    return `cotacao-familiar-resolve-${slug}-${q.members.length}-vidas.png`;
  }
  function save(blob,name){
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  async function download(){
    const q=getQuote();if(validate(q))return;
    try{paint(q);save(await getBlob(),fileName(q));toast('Cotação familiar em PNG gerada com sucesso.');}
    catch(e){toast('Não foi possível gerar o PNG neste navegador.');}
  }
  function shareWhatsApp(){
    const q=getQuote(); if(validate(q)) return;
    try {
      paint(q);
      // Apenas imagem PNG, usando o mesmo mecanismo da cotação individual.
      window.ResolveCompartilhamento.enviar(fields.canvas, fileName(q), toast);
    } catch (_) {
      toast('Não foi possível preparar o compartilhamento da imagem.');
    }
  }
  fields.individualTab.addEventListener('click',()=>showTab(false));
  fields.familyTab.addEventListener('click',()=>showTab(true));
  fields.contract.addEventListener('change',()=>{fillSelect(fields.plan,contractNow()?.planos||[]);update();});
  fields.plan.addEventListener('change',update);
  fields.vendedor.addEventListener('change',update);
  fields.add.addEventListener('click',()=>{
    if(people.length>=30)return;
    people.push(newPerson());renderPeople();
  });
  fields.people.addEventListener('click',e=>{
    const button=e.target.closest('[data-remove]');if(!button||people.length<=2)return;
    const i=people.findIndex(p=>p.id===Number(button.dataset.remove));
    if(i!==-1){people.splice(i,1);renderPeople();}
  });
  fields.people.addEventListener('input',e=>{
    const input=e.target;
    if(!input.dataset.field||input.dataset.field==='mode')return;
    if(input.dataset.field==='name'){
      const value=input.value.toLocaleUpperCase('pt-BR');
      if(input.value!==value){const a=input.selectionStart,b=input.selectionEnd;input.value=value;if(a!==null&&b!==null)input.setSelectionRange(a,b);}
    }
    updatePerson(Number(input.dataset.id),input.dataset.field,input.value);
  });
  fields.people.addEventListener('change',e=>{
    const input=e.target;
    if(input.dataset.field==='mode')updatePerson(Number(input.dataset.id),'mode',input.value);
    else if(input.dataset.field==='birth')updatePerson(Number(input.dataset.id),'birth',input.value);
  });
  fields.download.addEventListener('click',download);
  fields.share.addEventListener('click',shareWhatsApp);
  $('familyForm').addEventListener('submit',e=>e.preventDefault());
  fillSelect(fields.contract,dados.contratos);
  fillSelect(fields.plan,[]);
  fillSelect(fields.vendedor,dados.vendedores);
  renderPeople();
  // Aba individual inicia igual à versão 1.4.1.
})();
