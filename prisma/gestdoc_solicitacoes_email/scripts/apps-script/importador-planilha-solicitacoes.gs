/**
 * Importador de E-mails → Planilha (aba SOLICITACOES)
 * ─────────────────────────────────────────────────────
 * Roda periodicamente, varre a caixa de entrada e grava uma linha
 * na aba SOLICITACOES pra cada e-mail novo, com: Assunto, Remetente,
 * Data de Envio e Destinatário. Não depende do GestDoc — escreve
 * direto na planilha via Google Sheets.
 *
 * COMO INSTALAR:
 * 1. Abra script.google.com → "Novo projeto".
 * 2. Cole este código no lugar do Code.gs.
 * 3. Confira as constantes SPREADSHEET_ID e SHEET_NAME logo abaixo
 *    (já vêm preenchidas com o que você passou).
 * 4. No menu de funções (perto do botão "Executar"), selecione
 *    `configurarGatilho` e clique em Executar.
 * 5. Na primeira execução ele vai pedir autorização — aceite as
 *    permissões de Gmail e Planilhas Google.
 * 6. Pronto — roda sozinho a partir daí, a cada 10 minutos.
 *
 * COMO AJUSTAR O QUE É IMPORTADO:
 * Edite a constante BUSCA. Por padrão pega tudo que chega na caixa
 * de entrada. Pra filtrar por remetente ou assunto, exemplos:
 *   'in:inbox from:solicitacoes@hospital.com.br'
 *   'in:inbox subject:"Solicitação de Padronização"'
 */

const SPREADSHEET_ID = '1AhfvYOvqm8r1ouSsPCZA_nxvHSOclCALYJm-mwf4afo';
const SHEET_NAME = 'SOLICITACOES';
const BUSCA = 'in:inbox -label:Planilha-Importado';
const LABEL_IMPORTADO = 'Planilha-Importado';
const LOTE_MAXIMO = 20; // quantos e-mails processa por execução

// Colunas A–F são preenchidas automaticamente por este script.
// Colunas G–J ficam em branco aqui — são editadas depois na tela de
// Solicitações do GestDoc (Responsável, Data de Validação, Data de
// Padronização, Data de Publicação).
const CABECALHO_AUTOMATICO = ['ASSUNTO', 'REMETENTE', 'DATA DE ENVIO', 'DESTINATÁRIO', 'IMPORTADO EM', 'STATUS'];
const CABECALHO_COMPLETO = [
  ...CABECALHO_AUTOMATICO,
  'RESPONSÁVEL', 'DATA DE VALIDAÇÃO', 'DATA DE PADRONIZAÇÃO', 'DATA DE PUBLICAÇÃO',
];
const OPCOES_STATUS = ['Pendente', 'Em andamento', 'Concluído', 'Cancelado'];

function importarEmails() {
  const planilha = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = getOrCreateSheet_(planilha, SHEET_NAME);
  garantirCabecalho_(aba);

  const label = getOrCreateLabel_(LABEL_IMPORTADO);
  const threads = GmailApp.search(BUSCA, 0, LOTE_MAXIMO);

  if (threads.length === 0) {
    Logger.log('Nenhum e-mail novo.');
    return;
  }

  const linhas = [];
  const agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');

  threads.forEach(thread => {
    thread.getMessages().forEach(msg => {
      const dataEnvio = msg.getDate()
        ? Utilities.formatDate(msg.getDate(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')
        : '';
      linhas.push([
        msg.getSubject() || '(sem assunto)',
        msg.getFrom() || '',
        dataEnvio,
        msg.getTo() || '',
        agora,
        'Pendente',
      ]);
    });
  });

  if (linhas.length === 0) return;

  aba.getRange(aba.getLastRow() + 1, 1, linhas.length, CABECALHO_AUTOMATICO.length).setValues(linhas);

  // Dropdown de status nas linhas recém-criadas
  const linhaInicial = aba.getLastRow() - linhas.length + 1;
  const colunaStatus = CABECALHO_AUTOMATICO.indexOf('STATUS') + 1;
  const regraStatus = SpreadsheetApp.newDataValidation().requireValueInList(OPCOES_STATUS, true).build();
  aba.getRange(linhaInicial, colunaStatus, linhas.length, 1).setDataValidation(regraStatus);

  // Só marca como importado depois de gravar com sucesso
  threads.forEach(thread => thread.addLabel(label));

  Logger.log(linhas.length + ' e-mail(s) importado(s) para a aba ' + SHEET_NAME + '.');
}

function getOrCreateSheet_(planilha, nome) {
  return planilha.getSheetByName(nome) || planilha.insertSheet(nome);
}

function garantirCabecalho_(aba) {
  const primeiraLinha = aba.getRange(1, 1, 1, CABECALHO_COMPLETO.length).getValues()[0];
  const desatualizado = primeiraLinha[0] !== CABECALHO_COMPLETO[0]
    || primeiraLinha[CABECALHO_COMPLETO.length - 1] !== CABECALHO_COMPLETO[CABECALHO_COMPLETO.length - 1];
  if (desatualizado) {
    aba.getRange(1, 1, 1, CABECALHO_COMPLETO.length).setValues([CABECALHO_COMPLETO]);
    aba.getRange(1, 1, 1, CABECALHO_COMPLETO.length).setFontWeight('bold');
  }
}

function getOrCreateLabel_(nome) {
  return GmailApp.getUserLabelByName(nome) || GmailApp.createLabel(nome);
}

/**
 * Rode esta função UMA VEZ manualmente (menu Executar → configurarGatilho)
 * para autorizar o script e criar o gatilho automático de 10 em 10 minutos.
 */
function configurarGatilho() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'importarEmails') ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger('importarEmails')
    .timeBased()
    .everyMinutes(10)
    .create();

  Logger.log('Gatilho criado! Vai rodar a cada 10 minutos.');
  importarEmails(); // roda uma vez agora, pra testar
}
