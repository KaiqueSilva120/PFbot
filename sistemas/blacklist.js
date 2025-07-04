const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const fs = require('fs/promises');
const path = require('path');

const CANAL_BLACKLIST_ID = '1388934240749490196'; // seu canal fixo da blacklist
// Removi a constante CARGO_EQUIPE_GESTORA pois não será usada

const blacklistFilePath = path.join(__dirname, '..', 'blacklist.json');

let blacklist = [];

// Carrega blacklist do arquivo, ou inicializa vazio
async function carregarBlacklist() {
  try {
    const data = await fs.readFile(blacklistFilePath, 'utf8');
    blacklist = JSON.parse(data);
    console.log('[BLACKLIST] Lista carregada do arquivo.');
  } catch (err) {
    if (err.code === 'ENOENT') {
      blacklist = [];
      console.log('[BLACKLIST] Arquivo não encontrado, iniciando lista vazia.');
    } else {
      console.error('[BLACKLIST] Erro ao carregar lista:', err);
    }
  }
}

// Salva blacklist no arquivo
async function salvarBlacklist() {
  try {
    await fs.writeFile(blacklistFilePath, JSON.stringify(blacklist, null, 2), 'utf8');
    console.log('[BLACKLIST] Lista salva no arquivo.');
  } catch (err) {
    console.error('[BLACKLIST] Erro ao salvar lista:', err);
  }
}

function montarEmbedBlacklist() {
  const embed = new EmbedBuilder()
    .setTitle('🚫 BLACKLIST DA POLICIA FEDERAL')
    .setDescription(
      blacklist.length > 0
        ? blacklist.map((item, i) => `\`${i + 1}.\` **Nome:** ${item.nome}\n   **ID:** ${item.id || 'N/A'}\n   **Motivo:** ${item.motivo}\n   **Discord:** ${item.discordId || 'N/A'}`).join('\n\n')
        : '_Nenhum membro na blacklist._'
    )
    .setFooter({ text: `Última atualização: ${new Date().toLocaleString('pt-BR')}` });

  return embed;
}

function montarBotoes() {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('blacklist_adicionar')
        .setLabel('Adicionar Blacklist')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('blacklist_remover')
        .setLabel('Remover Blacklist')
        .setStyle(ButtonStyle.Danger),
    );
}

async function enviarOuEditarMensagemFixa(client) {
  try {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) throw new Error('Guild não encontrada.');

    const canal = guild.channels.cache.get(CANAL_BLACKLIST_ID);
    if (!canal) throw new Error('Canal da blacklist não encontrado.');

    const mensagens = await canal.messages.fetch({ limit: 50 });
    const mensagemFixa = mensagens.find(m =>
      m.author.id === client.user.id &&
      m.embeds.length > 0 &&
      m.embeds[0].title?.includes('BLACKLIST DA POLICIA FEDERAL')
    );

    const embed = montarEmbedBlacklist();
    const componentes = [montarBotoes()];

    if (mensagemFixa) {
      await mensagemFixa.edit({ embeds: [embed], components: componentes });
      console.log('[BLACKLIST] Mensagem fixa atualizada.');
    } else {
      await canal.send({ embeds: [embed], components: componentes });
      console.log('[BLACKLIST] Mensagem fixa enviada.');
    }
  } catch (error) {
    console.error('[BLACKLIST] Erro ao enviar/editar mensagem fixa:', error);
  }
}

function modalAdicionar() {
  const modal = new ModalBuilder()
    .setCustomId('blacklist_modal_adicionar')
    .setTitle('Adicionar membro à Blacklist');

  const inputNome = new TextInputBuilder()
    .setCustomId('blacklist_nome')
    .setLabel('Nome')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Nome completo ou apelido')
    .setRequired(true)
    .setMaxLength(45);

  const inputID = new TextInputBuilder()
    .setCustomId('blacklist_id')
    .setLabel('ID (RG da pessoa)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: 123456789')
    .setRequired(true)
    .setMaxLength(20);

  const inputMotivo = new TextInputBuilder()
    .setCustomId('blacklist_motivo')
    .setLabel('Motivo')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Motivo da blacklist')
    .setRequired(true)
    .setMaxLength(200);

  const inputDiscordId = new TextInputBuilder()
    .setCustomId('blacklist_discord')
    .setLabel('ID do Discord (opcional)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: 123456789012345678')
    .setRequired(false)
    .setMaxLength(20);

  modal.addComponents(
    new ActionRowBuilder().addComponents(inputNome),
    new ActionRowBuilder().addComponents(inputID),
    new ActionRowBuilder().addComponents(inputMotivo),
    new ActionRowBuilder().addComponents(inputDiscordId),
  );

  return modal;
}

function modalRemover() {
  if (blacklist.length === 0) return null;

  const options = blacklist.map((item, i) => ({
    label: item.nome,
    description: `ID: ${item.id}`,
    value: String(i),
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('blacklist_select_remover')
    .setPlaceholder('Selecione o membro para remover')
    .addOptions(options);

  return new ActionRowBuilder().addComponents(selectMenu);
}

async function tratarInteracoesBlacklist(interaction, client) {
  // REMOVIDA a verificação de permissão

  if (interaction.isButton()) {
    if (interaction.customId === 'blacklist_adicionar') {
      const modal = modalAdicionar();
      await interaction.showModal(modal);
      return true;
    }

    if (interaction.customId === 'blacklist_remover') {
      if (blacklist.length === 0) {
        await interaction.reply({ content: '❌ A blacklist está vazia.', ephemeral: true });
        return true;
      }

      const menu = modalRemover();
      if (!menu) {
        await interaction.reply({ content: '❌ A blacklist está vazia.', ephemeral: true });
        return true;
      }

      await interaction.reply({ content: 'Selecione o membro para remover:', components: [menu], ephemeral: true });
      return true;
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'blacklist_modal_adicionar') {
      const nome = interaction.fields.getTextInputValue('blacklist_nome').trim();
      const id = interaction.fields.getTextInputValue('blacklist_id').trim();
      const motivo = interaction.fields.getTextInputValue('blacklist_motivo').trim();
      const discordIdInput = interaction.fields.getTextInputValue('blacklist_discord').trim();
      const discordId = discordIdInput.length > 0 ? discordIdInput : null;

      if (blacklist.some(b => b.nome.toLowerCase() === nome.toLowerCase() && b.id === id)) {
        await interaction.reply({ content: '❌ Membro já está na blacklist.', ephemeral: true });
        return true;
      }

      blacklist.push({ nome, id, motivo, discordId });
      await salvarBlacklist();
      await enviarOuEditarMensagemFixa(client);

      await interaction.reply({ content: `✅ Membro **${nome}** adicionado à blacklist.`, ephemeral: true });
      return true;
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'blacklist_select_remover') {
      const selecionado = interaction.values[0];
      const membroRemovido = blacklist.splice(Number(selecionado), 1)[0];
      await salvarBlacklist();
      await enviarOuEditarMensagemFixa(client);

      await interaction.update({ content: `✅ Membro **${membroRemovido.nome}** removido da blacklist.`, components: [] });
      return true;
    }
  }

  return false;
}

// Ao carregar este módulo, já carrega a blacklist do arquivo
carregarBlacklist();

module.exports = {
  enviarOuEditarMensagemFixa,
  tratarInteracoesBlacklist,
};
