// sistemas/mandados.js
const fs = require('fs');
const path = require('path');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

const GUILD_ID = process.env.GUILD_ID;
const CANAL_EMITIR_MANDADOS_ID = '1390410957762592798';
const CANAL_MANDADOS_ID = '1390411012636934295';
const CANAL_MANDADOS_LOGS_ID = '1390458279569788968';
const CARGO_EQUIPE_GESTORA = process.env.CARGO_EQUIPE_GESTORA;

const PATH_MANDADOS = path.join(__dirname, '..', 'mandados.json');
const PATH_MANDADOS_ARQUIVADOS = path.join(__dirname, '..', 'mandados_arquivados.json');

function carregarMandados() {
  try {
    if (!fs.existsSync(PATH_MANDADOS)) return [];
    return JSON.parse(fs.readFileSync(PATH_MANDADOS, 'utf8'));
  } catch {
    return [];
  }
}
function salvarMandados(m) {
  fs.writeFileSync(PATH_MANDADOS, JSON.stringify(m, null, 2));
}
function carregarMandadosArquivados() {
  try {
    if (!fs.existsSync(PATH_MANDADOS_ARQUIVADOS)) return [];
    return JSON.parse(fs.readFileSync(PATH_MANDADOS_ARQUIVADOS, 'utf8'));
  } catch {
    return [];
  }
}
function salvarMandadosArquivados(m) {
  fs.writeFileSync(PATH_MANDADOS_ARQUIVADOS, JSON.stringify(m, null, 2));
}
function gerarNovoId(ms) {
  if (ms.length === 0) return '#0001';
  const nums = ms.map(x => parseInt(x.id.replace('#',''),10)).filter(n=>!isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return '#' + String(max+1).padStart(4,'0');
}

// Modal que junta Motivo + Provas + Descrição (opcional) em um único campo
function modalEmitirMandado() {
  const modal = new ModalBuilder()
    .setCustomId('mandado_modal_emitir')
    .setTitle('Emitir Mandado');

  const inMandado = new TextInputBuilder()
    .setCustomId('mandado_tipo')
    .setLabel('Mandado')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: Prisão, Busca e Apreensão, etc.')
    .setRequired(true)
    .setMaxLength(100);

  const inMotProvas = new TextInputBuilder()
    .setCustomId('mandado_moto_provas')
    .setLabel('Motivo/Provas')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Descreva o motivo e as provas relacionadas')
    .setRequired(true)
    .setMaxLength(500);

  const inNomeRg = new TextInputBuilder()
    .setCustomId('mandado_nome_rg')
    .setLabel('Nome + RG')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Nome completo e RG do alvo')
    .setRequired(true)
    .setMaxLength(150);

  const inCorpo = new TextInputBuilder()
    .setCustomId('mandado_corpo')
    .setLabel('Corporação')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: PMESP, PRF, PCESP, etc.')
    .setRequired(true)
    .setMaxLength(50);

  const inValidade = new TextInputBuilder()
    .setCustomId('mandado_validade')
    .setLabel('Validade')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('ex: 05/07/2025')
    .setRequired(false)
    .setMaxLength(50);

  modal.addComponents(
    new ActionRowBuilder().addComponents(inMandado),
    new ActionRowBuilder().addComponents(inMotProvas),
    new ActionRowBuilder().addComponents(inNomeRg),
    new ActionRowBuilder().addComponents(inCorpo),
    new ActionRowBuilder().addComponents(inValidade),
  );

  return modal;
}

function montarEmbedMandado(m, autorTag) {
  const embed = new EmbedBuilder()
    .setTitle('📜 MANDADO EMITIDO')
    .setColor('#0099ff')
    .addFields(
      { name: '⚖️ Mandado', value: m.tipo, inline: true },
      { name: '<:police:1389074817537278023> Nome + RG', value: m.nome_rg, inline: true },
      { name: '<:909:1389604756640759941> Corporação', value: m.corpo, inline: true },
      { name: '<a:fixclandst:1389998676805550182> Motivo + Provas', value: m.motivo_provas, inline: false },
      { name: '<a:agenda:1389604688894099472> Validade', value: m.validade || 'Indefinida', inline: true },
      { name: '<a:lupa:1389604951746941159> Responsável', value: autorTag, inline: true },
      { name: '⏱ Emitido em', value: m.dataEmissao, inline: true },
      { name: '<a:info:1390483277240074262> Status', value: m.status || 'Pendente', inline: true }
    )
    .setFooter({ text: `Mandado ID: ${m.id}` });

  return embed;
}

function montarBotoesMandado() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('mandado_cumprido')
      .setLabel('✅ | Cumprido')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('mandado_revogado')
      .setLabel('❌ | Revogado')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('mandado_arquivar')
      .setLabel('🗃️ | Arquivar')
      .setStyle(ButtonStyle.Secondary),
  );
}

async function enviarMensagemFixaEmitir(client) {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;

  const canal = guild.channels.cache.get(CANAL_EMITIR_MANDADOS_ID);
  if (!canal) return;

  const msgs = await canal.messages.fetch({ limit: 50 });
  const msg = msgs.find(m => m.author.id === client.user.id &&
    m.components.some(r => r.components.some(c => c.customId === 'mandado_emitir_button')));

  const embed = new EmbedBuilder()
    .setTitle('📜 PAINEL DE MANDADOS')
    .setDescription([
      'Este painel permite à **Equipe Gestora** emitir, gerenciar e arquivar mandados policiais.',
      '',
      '<:azul:1389374322933764186>  Apenas membros autorizados podem realizar essas ações.',
      '',
      '<a:seta:1389391513745887353>  Clique no botão abaixo para **emitir um novo mandado**.'
    ].join('\n'))
    .setColor('#2f3136')
    .setImage('https://cdn.discordapp.com/attachments/1242690408782495757/1390492986877546597/PoliciaFederalMandados.png')
    .setFooter({ text: 'Sistema de Mandados • Polícia Federal RP' });

  const btn = new ButtonBuilder()
    .setCustomId('mandado_emitir_button')
    .setLabel('📤 Emitir Mandado')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(btn);

  if (msg) return;  // mensagem já existe, não mexe
  else await canal.send({ embeds: [embed], components: [row] });
}

async function tratarInteracoesMandados(interaction, client) {
  if (!interaction.member.roles.cache.has(CARGO_EQUIPE_GESTORA)) {
    if (interaction.isButton() && interaction.customId === 'mandado_emitir_button') {
      return interaction.reply({ content: '❌ | Você não tem permissão.', ephemeral: true });
    }
    return false;
  }

  if (interaction.isButton()) {
    // Filtrar somente botões de mandado
    if (
      interaction.customId !== 'mandado_emitir_button' &&
      !interaction.customId.startsWith('mandado_')
    ) {
      // Não é botão relacionado a mandado
      return false;
    }

    if (interaction.customId === 'mandado_emitir_button') {
      await interaction.showModal(modalEmitirMandado());
      return true;
    }

    const mList = carregarMandados();

    const emb = interaction.message.embeds[0];
    if (!emb) return false; // Sem embed, não é mandado

    const id = emb.footer?.text.match(/#\d+/)?.[0];
    if (!id) return false; // Sem id no footer, não é mandado

    const idx = mList.findIndex(x => x.id === id);
    if (idx === -1) return interaction.reply({ content: '❌ | Mandado não encontrado.', ephemeral: true });

    const m = mList[idx];
    const now = new Date().toLocaleString('pt-BR');

    if (interaction.customId === 'mandado_cumprido' || interaction.customId === 'mandado_revogado') {
      m.status = interaction.customId === 'mandado_cumprido' ? 'Cumprido' : 'Revogado';
      m.responsavel = `${interaction.member.user.tag}`;
      m.dataResposta = now;

      const emb2 = montarEmbedMandado(m, m.responsavel)
        .setColor(m.status === 'Cumprido' ? '#00ff00' : '#ff0000')
        .addFields({
          name: m.status === 'Cumprido' ? '✅ Cumprido por' : '❌ Revogado por',
          value: `<@${interaction.user.id}>\n⏱️ na data de ${m.dataResposta}`
        });

      await interaction.message.edit({ embeds: [emb2], components: [] });
      mList[idx] = m;
      salvarMandados(mList);

      await interaction.reply({ content: `✅ | Mandado ${m.status.toLowerCase()}.`, ephemeral: true });
      return true;
    }

    if (interaction.customId === 'mandado_arquivar') {
      const arr = carregarMandadosArquivados();
      m.status = m.status || 'Arquivado';
      m.dataArquivado = new Date().toLocaleString('pt-BR');
      arr.push(m);
      salvarMandadosArquivados(arr);
      mList.splice(idx, 1);
      salvarMandados(mList);

      const guild = client.guilds.cache.get(GUILD_ID);
      const canalLogs = guild.channels.cache.get(CANAL_MANDADOS_LOGS_ID);
      canalLogs?.send({ embeds: [montarEmbedMandado(m, m.responsavel).setFooter({ text: `Arquivado em: ${m.dataArquivado}` })] });

      await interaction.message.delete().catch(() => { });
      interaction.reply({ content: '🗃️ | Mandado arquivado.', ephemeral: true });
      return true;
    }
  }

  if (interaction.isModalSubmit() && interaction.customId === 'mandado_modal_emitir') {
    const tipo = interaction.fields.getTextInputValue('mandado_tipo').trim();
    const mp = interaction.fields.getTextInputValue('mandado_moto_provas').trim();
    const nr = interaction.fields.getTextInputValue('mandado_nome_rg').trim();
    const corp = interaction.fields.getTextInputValue('mandado_corpo').trim();
    const val = interaction.fields.getTextInputValue('mandado_validade').trim();
    const list = carregarMandados();

    const id = gerarNovoId(list);
    const now = new Date().toLocaleString('pt-BR');
    const m = { id, tipo, motivo_provas: mp, nome_rg: nr, corpo: corp, validade: val || 'Indefinida', status: 'Pendente', dataEmissao: now };
    list.push(m);
    salvarMandados(list);

    const guild = interaction.client.guilds.cache.get(GUILD_ID);
    const canalMand = guild.channels.cache.get(CANAL_MANDADOS_ID);
    if (canalMand) {
      canalMand.send({ embeds: [montarEmbedMandado(m, interaction.user.tag)], components: [montarBotoesMandado()] });
    }

    interaction.reply({ content: `✅ | Mandado ${id} emitido.`, ephemeral: true });
    return true;
  }

  return false;
}

module.exports = {
  enviarMensagemFixaEmitir,
  tratarInteracoesMandados,
};
