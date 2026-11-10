# Resolve Saúde — Gerador de Cotações v2.0

Este projeto tem **duas janelas de cotação**: **Individual** (preservada da v1.4.1) e **Familiar** (nova).

## Testar / publicar

1. Extraia o ZIP por completo, preservando a pasta `assets`.
2. Abra `index.html` no navegador para testar localmente. Não requer banco de dados nem servidor.
3. Para usar online, publique todos os arquivos desta pasta no repositório GitHub Pages. Após publicar, atualize a página no navegador, de preferência com atualização forçada para evitar cache antigo.
4. A aba **Cotação familiar** abre o novo formulário. A aba **Cotação individual** permanece como na v1.4.1.

## Cotação familiar

- Escolha **contrato** (uso interno), depois um **plano** desse contrato.
- Preencha nome e **data de nascimento OU idade** para cada beneficiário. Os nomes são convertidos para maiúsculas sem retirar acentos ou `Ç`.
- A cotação familiar começa com **dois beneficiários**; é possível adicionar e remover (mínimo dois, máximo 30).
- Cada mensalidade é procurada em `tabelas_precos.js` por **contrato + plano + faixa etária**. O total é a soma das mensalidades da família. Os valores foram extraídos da coluna **COBRANÇA REAJUSTADA** da aba **BASE**, não sofrerão novo reajuste no sistema.
- As informações de **acomodação, abrangência e coparticipação** vêm do catálogo do plano.
- Se qualquer nome, idade, contato obrigatório ou mensalidade estiver faltando, **Baixar** e **Compartilhar** ficam indisponíveis.
- A cotação final **não exibe o contrato**. O cabeçalho e o rodapé têm o mesmo estilo visual da cotação individual, inclusive data de emissão e contatos do vendedor. A área de características do plano substitui o antigo bloco `CLIENTE` do modelo familiar.
- PNG com **1200 pixels de largura** e altura variável conforme a quantidade de pessoas; o site se adapta a celulares, tablets e computadores.
- O compartilhamento abre exclusivamente o **WhatsApp/WhatsApp Web**. A imagem poderá ser copiada para colagem no WhatsApp quando o navegador permitir; caso contrário, o sistema fará o download para anexar manualmente. O envio da imagem não é automático.

## Arquivos

- `index.html` — interface das duas janelas
- `styles.css` — estilos responsivos, incluindo os novos componentes familiares
- `app.js` — código da cotação individual, **sem alteração nas regras ou desenho**; apenas retirada a mensagem de "Em breve" da aba familiar
- `familiar.js` — formulário, validações, desenho PNG e compartilhamento da cotação familiar
- `dados.js` — vendedores, contratos, vínculos dos planos e características dos planos
- `tabelas_precos.js` — arquivo de preços isolado; atualize somente este arquivo em futuros reajustes
- `assets` — imagens e logos usadas nas cotações
- `CONFERENCIA_PRECOS.md` — combinações sem preços cadastrados na origem

## Observações importantes

- O sistema não altera valores das tabelas nem presume mensalidades ausentes.
- Os arquivos do GitHub Pages, incluindo `tabelas_precos.js`, ficam acessíveis ao público. Não inclua dados sigilosos neles.
- Para recém-nascidos, a idade pode ser `0`, e a faixa é `0 a 18`.
- Os vendedores sem WhatsApp cadastrado aparecem só com nome e e-mail.
