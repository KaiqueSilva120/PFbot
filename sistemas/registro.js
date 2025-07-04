const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
  EmbedBuilder,
  StringSelectMenuBuilder
} = require('discord.js');

const registrosTemporarios = {};
const mensagensRegistro = {};

const cargosPatentes = {
  "Diretor Geral": "832607681796898826",
  "Diretor": "832607682249883699",
  "Delegado Geral": "832607683349184533",
  "Delegado": "832607683710025740",
  "Superintendente": "832607684707614720",
  "Inspetor Chefe": "1389349675458629683",
  "Inspetor": "832607687560396800",
  "Investigador Chefe": "832607688248000602",
  "Investigador": "832607688579088396",
  "Escrivão": "832607689858088980",
  "Perito": "832607690349215755",
  "Agente Especial": "832607691616419851",
  "Agente": "832607692618596352",
  "Aluno": "1389079430890127454",
};

function formatarDataHora(date = new Date()) {
  const pad = n => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function registrarLog(tipo, interaction, extra = '') {
  const usuario = interaction.user?.tag || 'Usuário Desconhecido';
  const id = interaction.user?.id || 'ID desconhecido';
  console.log(`[REGISTRO_LOG] ${tipo} | ${usuario} (${id}) ${extra}`);
}

module.exports = {
  iniciarRegistro: async (client, CANAL_FORMULARIO_ID) => {
    const canal = await client.channels.fetch(CANAL_FORMULARIO_ID);
    const msgs = await canal.messages.fetch({ limit: 10 });
    const existente = msgs.find(msg => msg.author.id === client.user.id && msg.components?.[0]?.components[0]?.customId === 'abrir_formulario');

    if (!existente) {
      const botao = new ButtonBuilder()
        .setCustomId('abrir_formulario')
        .setLabel('📋 Enviar Registro')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(botao);

      await canal.send({
        content: '# <:rjp_pf:1362258331770552380> REGISTRO DA POLÍCIA FEDERAL\n\nApós ser recrutado(a), clique no botão abaixo para se registrar.',
        components: [row],
        files: ['https://cdn.discordapp.com/attachments/1242690408782495757/1390012386022527182/policiafederalbyK.png']
      });
    }
  },

  tratarInteracao: async (interaction, client, { CANAL_REGISTROS_ID, CARGO_EQUIPE_GESTORA, CARGO_REGISTRADO, CARGO_ALTO_COMANDO }) => {
    try {
      if (interaction.isButton() && interaction.customId === 'abrir_formulario') {
        const modal = new ModalBuilder()
          .setCustomId('registro_modal')
          .setTitle('Registro Policial')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('nome').setLabel('Nome').setStyle(TextInputStyle.Short).setRequired(true)
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
            )
          );
        await interaction.showModal(modal);
      }

      else if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'registro_modal') {
        await interaction.deferReply({ flags: 64 });

        const dados = {
          nome: interaction.fields.getTextInputValue('nome'),
          id: interaction.fields.getTextInputValue('id'),
          patenteInformada: interaction.fields.getTextInputValue('patente'),
          recrutador: interaction.fields.getTextInputValue('recrutador'),
          ts3: interaction.fields.getTextInputValue('ts3')
        };

        const userId = interaction.user.id;
        registrosTemporarios[userId] = dados;

        const canal = await client.channels.fetch(CANAL_REGISTROS_ID);
        const embed = new EmbedBuilder()
          .setTitle('<a:sino:1389605284200185887> | Novo Registro Recebido')
          .setColor('Blue')
          .addFields(
            { name: 'Nome', value: dados.nome },
            { name: 'ID', value: dados.id },
            { name: 'Patente (informada)', value: dados.patenteInformada },
            { name: 'Recrutador', value: dados.recrutador },
            { name: 'TS3', value: dados.ts3 }
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`aceitar_${userId}`).setLabel('✅ Aceitar Registro').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`recusar_${userId}`).setLabel('❌ Negar Registro').setStyle(ButtonStyle.Danger)
        );

        const msg = await canal.send({
          content: `Registro recebido de: <@${userId}>\n<@&${CARGO_EQUIPE_GESTORA}>`,
          embeds: [embed],
          components: [row]
        });

        mensagensRegistro[userId] = msg.id;
        await interaction.editReply({ content: 'Registro enviado para análise com sucesso!', flags: 64 });
      }

      else if (interaction.isButton() && interaction.customId.startsWith('aceitar_')) {
        const targetId = interaction.customId.split('_')[1];
        const dados = registrosTemporarios[targetId];
        if (!dados) return;

        const select = new StringSelectMenuBuilder()
          .setCustomId(`alterar_nome_${targetId}`)
          .setPlaceholder('Deseja alterar o nome antes de aprovar?')
          .addOptions(
            {
              label: `Não, manter: ${dados.nome}`,
              value: 'manter',
              description: 'Usar nome enviado no registro',
              emoji: '✅'
            },
            {
              label: 'Sim, quero alterar',
              value: 'alterar',
              description: 'Abrir campo para digitar novo nome',
              emoji: '✏️'
            }
          );

        const row = new ActionRowBuilder().addComponents(select);

        await interaction.reply({
          content: `Deseja alterar o nome antes de aprovar o registro de <@${targetId}>?`,
          components: [row],
          flags: 64
        });
      }

      else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('alterar_nome_')) {
        const targetId = interaction.customId.split('_')[2];
        const escolha = interaction.values[0];

        if (escolha === 'manter') {
          const options = Object.entries(cargosPatentes).map(([nome, id]) => ({ label: nome, value: id }));
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`selecionar_cargo_${targetId}`)
            .setPlaceholder('Selecione a patente para aprovar o registro')
            .addOptions(options);

          const row = new ActionRowBuilder().addComponents(selectMenu);

          await interaction.update({
            content: 'Selecione a patente para confirmar o registro:',
            components: [row]
          });
        } else {
          const modal = new ModalBuilder()
            .setCustomId(`modal_nome_custom_${targetId}`)
            .setTitle('Alterar Nome do Registro')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('novo_nome')
                  .setLabel('Digite o novo nome')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(true)
              )
            );
          await interaction.showModal(modal);
        }
      }

      else if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('modal_nome_custom_')) {
        const targetId = interaction.customId.split('_')[3];
        const novoNome = interaction.fields.getTextInputValue('novo_nome');
        const dados = registrosTemporarios[targetId];
        if (!dados) return;

        dados.nome = novoNome;

        const options = Object.entries(cargosPatentes).map(([nome, id]) => ({ label: nome, value: id }));
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`selecionar_cargo_${targetId}`)
          .setPlaceholder('Selecione a patente para aprovar o registro')
          .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
          content: `Nome alterado com sucesso para: **${novoNome}**.\nAgora selecione a patente para continuar:`,
          components: [row],
          flags: 64
        });
      }

      // ... aqui continua seu código de seleção de cargo e aprovação/recusa (sem alteração)
    } catch (e) {
      console.error('[ERRO REGISTRO]', e);
    }
  }
};
