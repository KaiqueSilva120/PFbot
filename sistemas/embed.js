// sistemas/embed.js
const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  InteractionResponseFlags
} = require('discord.js');

const comandosAtivos = new Map(); // Armazena embed temporária por usuário

const comandoEmbed = new SlashCommandBuilder()
  .setName('embed')
  .setDescription('Cria uma embed personalizada com título, descrição, cor, thumbnail e imagem.');

async function executar(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('criar_embed')
    .setTitle('Criar Embed');

  const inputTitulo = new TextInputBuilder()
    .setCustomId('titulo')
    .setLabel('Título da embed')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const inputDescricao = new TextInputBuilder()
    .setCustomId('descricao')
    .setLabel('Descrição da embed')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const inputCor = new TextInputBuilder()
    .setCustomId('cor')
    .setLabel('Cor (ex: #00ffcc)') // Corrigido para até 45 caracteres
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const inputThumbnail = new TextInputBuilder()
    .setCustomId('thumbnail')
    .setLabel('Thumbnail (URL da imagem pequena)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const inputImagem = new TextInputBuilder()
    .setCustomId('imagem')
    .setLabel('Imagem da embed (URL)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(inputTitulo),
    new ActionRowBuilder().addComponents(inputDescricao),
    new ActionRowBuilder().addComponents(inputCor),
    new ActionRowBuilder().addComponents(inputThumbnail),
    new ActionRowBuilder().addComponents(inputImagem),
  );

  await interaction.showModal(modal);
}

async function tratarEmbed(interaction, client) {
  const titulo = interaction.fields.getTextInputValue('titulo');
  const descricao = interaction.fields.getTextInputValue('descricao');
  const corHex = interaction.fields.getTextInputValue('cor') || '#00BFFF';
  const thumbnail = interaction.fields.getTextInputValue('thumbnail');
  const imagem = interaction.fields.getTextInputValue('imagem');

  const embed = new EmbedBuilder()
    .setTitle(titulo)
    .setDescription(descricao)
    .setColor(corHex);

  if (thumbnail && isValidURL(thumbnail)) embed.setThumbnail(thumbnail);
  if (imagem && isValidURL(imagem)) embed.setImage(imagem);

  comandosAtivos.set(interaction.user.id, embed);

  await interaction.reply({
    content: '✅ Agora mencione o canal onde deseja enviar a embed.',
    flags: 64 // Equivale a ephemeral: true (sem warning)
  });
}

async function tratarMensagemCanal(message) {
  if (!comandosAtivos.has(message.author.id)) return;
  const embed = comandosAtivos.get(message.author.id);

  const canalMencionado = message.mentions.channels.first();
  if (!canalMencionado) {
    await message.reply('❌ Mencione um canal válido.');
    return;
  }

  try {
    await canalMencionado.send({ embeds: [embed] });
    await message.reply('✅ Embed enviada com sucesso!');
  } catch (err) {
    console.error('[ERRO AO ENVIAR EMBED]', err);
    await message.reply('❌ Ocorreu um erro ao tentar enviar a embed.');
  }

  comandosAtivos.delete(message.author.id);
}

// Valida se a string é uma URL válida
function isValidURL(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  comandoEmbed,
  executar,
  tratarEmbed,
  tratarMensagemCanal
};
