require('dotenv').config();
const http = require('http');
const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder,
  ChannelType,
} = require('discord.js');
const { conectarCall } = require('./sistemas/call');

const {
  initAtendimento,
  handleAtendimentoMenu,
  handleTicketButtons,
} = require('./sistemas/atendimento');

const {
  iniciarRegistro,
  tratarInteracao: tratarInteracaoRegistro,
} = require('./sistemas/registro');

const {
  registrarComandos,
  executarComando,
  tratarModal,
} = require('./sistemas/comandos');

const { tratarMensagemCanal } = require('./sistemas/embed');

const {
  enviarOuEditarMensagemFixa: enviarMensagemBlacklist,
  tratarInteracoesBlacklist,
} = require('./sistemas/blacklist');

const {
  enviarOuEditarMensagemFixa: enviarMensagemAusencia,
  tratarInteracoesAusencia,
} = require('./sistemas/ausencia');

const {
  enviarMensagemFixaEmitir,
  tratarInteracoesMandados,
} = require('./sistemas/mandados');

const edital = require('./sistemas/edital');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot rodando normalmente.\n');
}).listen(PORT, () => {
  console.log(`Servidor HTTP rodando na porta ${PORT}`);
});

const ID_MENSAGEM_REACAO = '1391286930028757002';
const ID_CANAL_DA_MENSAGEM = '1391248897862664324';
const ID_CARGO_REACAO = '1391251666321281207';
const EMOJI_REACAO = 'rjp_pf';

client.once('ready', async () => {
  console.log(`[BOT] Conectado como ${client.user.tag}`);

  await initAtendimento(client, {
    CARGO_EQUIPE_GESTORA: process.env.CARGO_EQUIPE_GESTORA,
    GUILD_ID: process.env.GUILD_ID,
    log: console.log,
  });

  await iniciarRegistro(client, process.env.CANAL_FORMULARIO_ID);
  await enviarMensagemBlacklist(client);
  await enviarMensagemAusencia(client);
  await enviarMensagemFixaEmitir(client);
  await registrarComandos(client, process.env.TOKEN, process.env.CLIENT_ID, process.env.GUILD_ID);
  await conectarCall(client);
  await edital.init(client); // Mensagem fixa do sistema de edital

  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const channel = await guild.channels.fetch(ID_CANAL_DA_MENSAGEM);
    if (!channel) return;

    const mensagem = await channel.messages.fetch(ID_MENSAGEM_REACAO).catch(() => null);
    if (!mensagem) return;

    const jaReagiu = mensagem.reactions.cache.has(EMOJI_REACAO);
    if (!jaReagiu) {
      const emoji = guild.emojis.cache.find(e => e.name === EMOJI_REACAO);
      if (emoji) await mensagem.react(emoji).catch(console.error);
    }
  } catch (err) {
    console.error('Erro ao adicionar reação automática:', err);
  }
});

client.on('interactionCreate', async (interaction) => {
  console.log('[INTERAÇÃO]', {
    tipo: interaction.type,
    customId: interaction.customId,
    comando: interaction.commandName,
  });

  try {
    if (interaction.isCommand()) {
      await executarComando(interaction, client, process.env.CARGO_EQUIPE_GESTORA, process.env.CANAL_MENSAGENS_MEMBROS);
      return;
    }

    if (interaction.isModalSubmit()) {
      if (await tratarModal(interaction, client)) return;
      if (await tratarInteracoesBlacklist(interaction, client)) return;
      if (await tratarInteracoesAusencia(interaction, client)) return;
      if (await tratarInteracoesMandados(interaction, client)) return;
      if (await edital.tratarModal(interaction, client)) return;

      await tratarInteracaoRegistro(interaction, client, {
        CANAL_REGISTROS_ID: process.env.CANAL_REGISTROS_ID,
        CARGO_EQUIPE_GESTORA: process.env.CARGO_EQUIPE_GESTORA,
        CARGO_REGISTRADO: process.env.CARGO_REGISTRADO,
        CARGO_ALTO_COMANDO: process.env.CARGO_ALTO_COMANDO,
      });
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'atendimento_menu') {
        await handleAtendimentoMenu(interaction, client);
        return;
      }
      if (await tratarInteracoesBlacklist(interaction, client)) return;
      if (await tratarInteracoesAusencia(interaction, client)) return;
      if (await tratarInteracoesMandados(interaction, client)) return;

      await tratarInteracaoRegistro(interaction, client, {
        CANAL_REGISTROS_ID: process.env.CANAL_REGISTROS_ID,
        CARGO_EQUIPE_GESTORA: process.env.CARGO_EQUIPE_GESTORA,
        CARGO_REGISTRADO: process.env.CARGO_REGISTRADO,
        CARGO_ALTO_COMANDO: process.env.CARGO_ALTO_COMANDO,
      });
      return;
    }

    if (interaction.isButton()) {
      if (await edital.handleRealizarEdital(interaction, client)) return;
      if (await edital.handleEnviarEdital(interaction, client)) return;
      if (await edital.handleAceitarRecusarEdital(interaction, client)) return;

      if (['fechar_ticket', 'notificar_equipe', 'notificar_membro', 'reabrir_ticket', 'excluir_topico'].includes(interaction.customId)) {
        await handleTicketButtons(interaction, client);
        return;
      }

      if (['blacklist_adicionar', 'blacklist_remover'].includes(interaction.customId)) {
        await tratarInteracoesBlacklist(interaction, client);
        return;
      }

      if (await tratarInteracoesAusencia(interaction, client)) return;
      if (await tratarInteracoesMandados(interaction, client)) return;

      if (interaction.customId === 'abrir_formulario') {
        const modal = new ModalBuilder()
          .setCustomId('registro_modal')
          .setTitle('Registro Policial')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('nome').setLabel('Nome Completo').setStyle(TextInputStyle.Short).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('id').setLabel('ID').setStyle(TextInputStyle.Short).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('patente').setLabel('Patente').setStyle(TextInputStyle.Short).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('recrutador').setLabel('Recrutador').setStyle(TextInputStyle.Short).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('ts3').setLabel('URL TS3').setStyle(TextInputStyle.Short).setRequired(true)
            ),
          );
        await interaction.showModal(modal);
        return;
      }

      await tratarInteracaoRegistro(interaction, client, {
        CANAL_REGISTROS_ID: process.env.CANAL_REGISTROS_ID,
        CARGO_EQUIPE_GESTORA: process.env.CARGO_EQUIPE_GESTORA,
        CARGO_REGISTRADO: process.env.CARGO_REGISTRADO,
        CARGO_ALTO_COMANDO: process.env.CARGO_ALTO_COMANDO,
      });
      return;
    }
  } catch (err) {
    console.error('[ERRO DE INTERAÇÃO]', err);
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: '❌ Ocorreu um erro ao processar sua interação. Por favor, tente novamente ou contate a equipe gestora.',
          ephemeral: true,
        });
      } catch (replyError) {
        console.error('Erro ao tentar responder a interação falha:', replyError);
      }
    }
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  await tratarMensagemCanal(message);
});

client.on('error', (error) => {
  console.error('[CLIENT ERROR]', error);
});

client.on('shardError', (error) => {
  console.error('[SHARD ERROR]', error);
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (reaction.message.id !== ID_MENSAGEM_REACAO || user.bot) return;
  if (reaction.partial) try { await reaction.fetch(); } catch { return; }

  if (reaction.emoji.name === EMOJI_REACAO) {
    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (member) await member.roles.add(ID_CARGO_REACAO).catch(console.error);
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (reaction.message.id !== ID_MENSAGEM_REACAO || user.bot) return;
  if (reaction.partial) try { await reaction.fetch(); } catch { return; }

  if (reaction.emoji.name === EMOJI_REACAO) {
    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (member) await member.roles.remove(ID_CARGO_REACAO).catch(console.error);
  }
});

console.log('Tentando conectar ao Discord com token:', process.env.TOKEN ? '[OK]' : '[FALHA]');

client.login(process.env.TOKEN)
  .then(() => console.log('[BOT] Login bem-sucedido.'))
  .catch((error) => console.error('[LOGIN ERROR]', error));
