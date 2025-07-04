const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require('discord.js');

const fs = require('fs');
const path = require('path');
const ausenciasPath = path.join(__dirname, '../data/ausencias.json');

const CANAL_FIXO = '1389466160130424862';
const CANAL_LOG = '1388992805753589821';
const CARGO_AUSENTE = '1389619038942138590';
const CARGO_EQUIPE_GESTORA = process.env.CARGO_EQUIPE_GESTORA || '1389346922300571739'; // fallback

let ausencias = fs.existsSync(ausenciasPath)
  ? JSON.parse(fs.readFileSync(ausenciasPath))
  : [];

function botoesFixaAusencia() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ausencia_solicitar')
      .setLabel('⏱️ | Solicitar Ausência')
      .setStyle(ButtonStyle.Secondary)
  );
}

const TEXTO_FIXO =
  `**# <:data:1389411249519071263> SOLICITAR AUSENCIA**\n\n` +
  `- Caso fique **mais de 2 dias offline**, é obrigatório informar sua ausência.\n` +
  `<a:seta:1389391513745887353> Use esta opção com responsabilidade. Informe as **datas reais** da sua ausência para evitar problemas futuros.`;

async function enviarOuEditarMensagemFixa(client) {
  const canal = await client.channels.fetch(CANAL_FIXO);
  if (!canal) return;

  const mensagens = await canal.messages.fetch({ limit: 50 });
  // Busca a mensagem do bot que tenha o botão 'ausencia_solicitar'
  const existente = mensagens.find(m =>
    m.author.id === client.user.id &&
    m.components.some(row =>
      row.components.some(c => c.customId === 'ausencia_solicitar')
    )
  );

  const row = botoesFixaAusencia();

  if (existente) {
    console.log('[AUSÊNCIA] Mensagem fixa já existe, não será enviada nem editada.');
    return; // não edita nem envia para evitar duplicação
  } else {
    await canal.send({ content: TEXTO_FIXO, components: [row] });
    console.log('[AUSÊNCIA] Mensagem fixa enviada.');
  }
}

// Função para calcular quantidade de dias (incluindo o dia inicial e final)
function calcularDias(inicio, fim) {
  try {
    const [di, mi, ai] = inicio.split('/').map(Number);
    const [df, mf, af] = fim.split('/').map(Number);
    const dtInicio = new Date(ai, mi - 1, di);
    const dtFim = new Date(af, mf - 1, df);
    const diff = Math.floor((dtFim - dtInicio) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  } catch {
    return '?';
  }
}

function modalSolicitacaoAusencia() {
  const modal = new ModalBuilder()
    .setCustomId('ausencia_modal')
    .setTitle('Solicitar Ausência');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('ausencia_id')
        .setLabel('ID')
        .setRequired(true)
        .setMaxLength(20)
        .setStyle(TextInputStyle.Short)),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('ausencia_motivo')
        .setLabel('Motivo')
        .setRequired(true)
        .setMaxLength(200)
        .setStyle(TextInputStyle.Paragraph)),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('ausencia_inicio')
        .setLabel('Data de Início')
        .setRequired(true)
        .setPlaceholder('Ex: 03/07/2025')
        .setStyle(TextInputStyle.Short)),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('ausencia_fim')
        .setLabel('Data de Fim')
        .setRequired(true)
        .setPlaceholder('Ex: 15/07/2025')
        .setStyle(TextInputStyle.Short))
  );

  return modal;
}

async function tratarInteracoesAusencia(interaction, client) {
  const { user, member } = interaction;

  if (interaction.isButton()) {
    if (interaction.customId === 'ausencia_solicitar') {
      await interaction.showModal(modalSolicitacaoAusencia());
      return true;
    }

    if (interaction.customId === 'ausencia_aceitar') {
      const ausencia = ausencias.find(a => a.mensagemId === interaction.message.id && a.status === 'Pendente');
      if (!ausencia) return interaction.reply({ content: '❌ Ausência não encontrada.', ephemeral: true });

      ausencia.status = 'Aceita';
      ausencia.analista = user.id;
      ausencia.dataResposta = new Date().toLocaleString('pt-BR');
      fs.writeFileSync(ausenciasPath, JSON.stringify(ausencias, null, 2));

      const embed = interaction.message.embeds[0];
      const novoEmbed = EmbedBuilder.from(embed)
        .setColor('Green')
        .setDescription(embed.description) // mantém descrição sem adicionar quem aceitou aqui
        .addFields({ name: '✅ Aceita por', value: `<@${user.id}>`, inline: true })
        .setFooter({ text: ausencia.dataResposta });

      const membro = await interaction.guild.members.fetch(ausencia.userId);
      if (membro && !membro.roles.cache.has(CARGO_AUSENTE)) {
        await membro.roles.add(CARGO_AUSENTE);
      }

      await interaction.update({ content: '', embeds: [novoEmbed], components: [] });
      return true;
    }

    if (interaction.customId === 'ausencia_recusar') {
      const ausencia = ausencias.find(a => a.mensagemId === interaction.message.id && a.status === 'Pendente');
      if (!ausencia) return interaction.reply({ content: '❌ Ausência para recusa não encontrada.', ephemeral: true });

      ausencia.idModalRecusaMensagemId = interaction.message.id;

      const modal = new ModalBuilder()
        .setCustomId('ausencia_modal_recusa')
        .setTitle('Motivo da Recusa')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('motivo_recusa')
              .setLabel('Motivo da recusa')
              .setRequired(true)
              .setStyle(TextInputStyle.Paragraph)
          )
        );

      await interaction.showModal(modal);
      return true;
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'ausencia_modal') {
      const id = interaction.fields.getTextInputValue('ausencia_id');
      const motivo = interaction.fields.getTextInputValue('ausencia_motivo');
      const inicio = interaction.fields.getTextInputValue('ausencia_inicio');
      const fim = interaction.fields.getTextInputValue('ausencia_fim');
      const diasAusencia = calcularDias(inicio, fim);

      const canalLogs = await client.channels.fetch(CANAL_LOG);
      if (!canalLogs) return;

      const textoCima = `<a:sino:1389605284200185887> | Ausência solicitada de: <@${user.id}>\n<:police:1389074817537278023> | <@&${CARGO_EQUIPE_GESTORA}>`;

      const embed = new EmbedBuilder()
        .setColor('Yellow')
        .setDescription(
          `<:c_:1389391603415650326> | QRA: <@${user.id}>\n` +
          `<:cmdgeral:1389391645748760689> | ID: \`${id}\`\n` +
          `<a:lupa:1389604951746941159> | Motivo: \`${motivo}\`\n` +
          `<a:agenda:1389604688894099472>| Data de Início: \`${inicio}\`\n` +
          `<a:agenda:1389604688894099472>| Data de Fim: \`${fim}\`\n` +
          `📆 **Total de dias:** \`${diasAusencia} dia(s)\``
        )
        .setFooter({ text: 'Aguardando análise da Equipe Gestora.' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ausencia_aceitar')
          .setLabel('✅ | Aceitar Ausência')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('ausencia_recusar')
          .setLabel('❌ | Recusar Ausência')
          .setStyle(ButtonStyle.Danger)
      );

      const msg = await canalLogs.send({ content: textoCima, embeds: [embed], components: [row] });
      ausencias.push({ mensagemId: msg.id, userId: user.id, status: 'Pendente' });
      fs.writeFileSync(ausenciasPath, JSON.stringify(ausencias, null, 2));

      await interaction.reply({ content: '✅ Sua solicitação foi enviada.', flags: 64 });
      return true;
    }

    if (interaction.customId === 'ausencia_modal_recusa') {
      const motivoRecusa = interaction.fields.getTextInputValue('motivo_recusa');
      const ausencia = ausencias.find(a => a.status === 'Pendente' && a.idModalRecusaMensagemId);
      if (!ausencia) return interaction.reply({ content: '❌ Ausência para recusa não encontrada.', ephemeral: true });

      ausencia.status = 'Recusada';
      ausencia.analista = user.id;
      ausencia.dataResposta = new Date().toLocaleString('pt-BR');
      ausencia.motivoRecusa = motivoRecusa;
      fs.writeFileSync(ausenciasPath, JSON.stringify(ausencias, null, 2));

      const canal = await client.channels.fetch(CANAL_LOG);
      const msg = await canal.messages.fetch(ausencia.idModalRecusaMensagemId);

      const embed = msg.embeds[0];
      const novoEmbed = EmbedBuilder.from(embed)
        .setColor('Red')
        .setDescription(embed.description + `\n\n<a:c_warningrgbFXP:1390000774863519765> **Motivo da recusa:** \`${motivoRecusa}\``)
        .addFields({ name: '❌ Recusada por', value: `<@${user.id}>`, inline: true })
        .setFooter({ text: ausencia.dataResposta });

      await msg.edit({ embeds: [novoEmbed], components: [] });

      const membro = await client.users.fetch(ausencia.userId);
      await membro.send(
        `**Olá, ${membro.username} 👋**\n\n` +
        `Sua Ausência na **Polícia Federal - CMRP** foi **recusada** no momento.\n\n` +
        `<a:c_warningrgbFXP:1390000774863519765> **Motivo:** ${motivoRecusa}\n` +
        `<:data:1389411249519071263> **Data e hora:** ${ausencia.dataResposta}\n\n` +
        `Caso tenha dúvidas, entre em contato com a equipe gestora ou abra um ticket.\n\n` +
        `Atenciosamente,\n**Gestão Polícia Federal** <:police:1389074817537278023>`
      );

      await interaction.reply({ content: '✅ Ausência recusada e membro notificado.', ephemeral: true });
      return true;
    }
  }

  return false;
}

module.exports = {
  enviarOuEditarMensagemFixa,
  tratarInteracoesAusencia,
};
