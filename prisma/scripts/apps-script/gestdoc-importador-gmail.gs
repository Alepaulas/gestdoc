/**
 * GestDoc — Importador automático de e-mails
 * ─────────────────────────────────────────────
 * Roda periodicamente (gatilho por tempo), varre a caixa de entrada,
 * extrai assunto/remetente/destinatário/data de cada e-mail novo e
 * envia para o webhook do GestDoc, que cria uma Solicitação "ABERTA"
 * para cada um.
 *
 * COMO INSTALAR:
 * 1. No Gmail (conta que vai monitorar), abra script.google.com → "Novo projeto".
 * 2. Cole este código no editor (substitua o Code.gs).
 * 3. Em "Configurações do projeto" (ícone de engrenagem) → "Propriedades do script",
 *    adicione:
 *      WEBHOOK_URL   = https://SEU-APP.vercel.app/api/webhooks/gmail-import
 *      API_KEY       = (a mesma string que você colocar em GMAIL_IMPORT_API_KEY no Vercel)
 * 4. Rode a função `configurarGatilho` uma vez manualmente (menu Executar).
 *    Isso autoriza o script e cria o gatilho automático.
 * 5. Pronto — a partir daí roda sozinho a cada 10 minutos.
 *
 * COMO AJUSTAR O QUE É IMPORTADO:
 * Edite a constante BUSCA abaixo. Por padrão pega tudo que chega na caixa
 * de entrada. Se quiser importar só e-mails de um remetente específico ou
 * com um assunto padrão, troque para algo como:
 *   'in:inbox from:solicitacoes@hospital.com.br'
 *   'in:inbox subject:"Solicitação de Padronização"'
 */

const BUSCA = 'in:inbox -label:GestDoc-Importado';
const LABEL_IMPORTADO = 'GestDoc-Importado';
const LOTE_MAXIMO = 20; // quantos e-mails processa por execução do gatilho

function importarEmails() {
  const props = PropertiesService.getScriptProperties();
  const webhookUrl = props.getProperty('WEBHOOK_URL');
  const apiKey = props.getProperty('API_KEY');

  if (!webhookUrl || !apiKey) {
    Logger.log('ERRO: configure WEBHOOK_URL e API_KEY em Propriedades do script.');
    return;
  }

  const label = getOrCreateLabel_(LABEL_IMPORTADO);
  const threads = GmailApp.search(BUSCA, 0, LOTE_MAXIMO);

  if (threads.length === 0) {
    Logger.log('Nenhum e-mail novo.');
    return;
  }

  const emails = [];
  const mensagensPorThread = []; // guarda referência p/ marcar depois

  threads.forEach(thread => {
    const mensagens = thread.getMessages();
    mensagens.forEach(msg => {
      emails.push({
        messageId: msg.getId(),
        assunto: msg.getSubject() || '(sem assunto)',
        remetente: msg.getFrom() || '',
        destinatario: msg.getTo() || '',
        dataEnvio: msg.getDate() ? msg.getDate().toISOString() : null,
        snippet: (msg.getPlainBody() || '').replace(/\s+/g, ' ').trim().slice(0, 200),
      });
    });
    mensagensPorThread.push(thread);
  });

  if (emails.length === 0) return;

  const resposta = UrlFetchApp.fetch(webhookUrl, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + apiKey },
    payload: JSON.stringify({ emails }),
    muteHttpExceptions: true,
  });

  const codigo = resposta.getResponseCode();
  const corpo = resposta.getContentText();
  Logger.log('Webhook respondeu ' + codigo + ': ' + corpo);

  if (codigo >= 200 && codigo < 300) {
    // Só marca como importado se o servidor confirmou o recebimento
    mensagensPorThread.forEach(thread => thread.addLabel(label));
  } else {
    Logger.log('Falha ao importar — threads NÃO marcadas, serão tentadas de novo na próxima execução.');
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
  // Remove gatilhos antigos desta função, se houver, pra não duplicar
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'importarEmails') ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger('importarEmails')
    .timeBased()
    .everyMinutes(10)
    .create();

  Logger.log('Gatilho criado! O importador vai rodar a cada 10 minutos.');
  // Roda uma vez agora, pra testar
  importarEmails();
}
