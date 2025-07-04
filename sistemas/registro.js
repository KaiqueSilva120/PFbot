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
    try {
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
        console.log('[REGISTRO] Mensagem fixa enviada.');
      } else {
        console.log('[REGISTRO] Mensagem fixa já existe no canal.');
      }
    } catch (err) {
      console.error('[ERRO iniciarRegistro]', err);
    }
  },

  tratarInteracao: async (interaction, client, {
    CANAL_REGISTROS_ID,
    CARGO_EQUIPE_GESTORA,
    CARGO_REGISTRADO,
    CARGO_ALTO_COMANDO
  }) => {
    try {
      registrarLog('INTERACAO_DETECTADA', interaction, `Tipo: ${interaction.type}, ID: ${interaction.customId}`);

      // Botão para abrir o formulário
      if (interaction.isButton() && interaction.customId === 'abrir_formulario') {
        registrarLog('BOTAO_ABRIR_FORMULARIO', interaction);
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

      // Modal de registro enviado
      else if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'registro_modal') {
        registrarLog('MODAL_SUBMIT_REGISTRO', interaction);
        await interaction.deferReply({ ephemeral: true });

        const dados = {
          nome: interaction.fields.getTextInputValue('nome'),
          id: interaction.fields.getTextInputValue('id'),
          patenteInformada: interaction.fields.getTextInputValue('patente'),
          recrutador: interaction.fields.getTextInputValue('recrutador'),
          ts3: interaction.fields.getTextInputValue('ts3')
        };

        console.log('[DADOS REGISTRO]', dados);

        const userId = interaction.user.id;
        registrosTemporarios[userId] = dados;

        const canal = await client.channels.fetch(CANAL_REGISTROS_ID);
        const embed = new EmbedBuilder()
          .setTitle('<a:sino:1389605284200185887> | Novo Registro Recebido')
          .setColor('Blue')
          .addFields(
            { name: '<:c_:1389391603415650326> | Nome', value: dados.nome },
            { name: '<:cmdgeral:1389391645748760689> | ID', value: dados.id },
            { name: '<:staff:1389391852909625377> | Patente (informada)', value: dados.patenteInformada },
            { name: '<a:fixclandst:1389998676805550182> | Recrutador', value: dados.recrutador },
            { name: '🔗 TS3', value: dados.ts3 }
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`aceitar_${userId}`).setLabel('✅ | Aceitar Registro').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`recusar_${userId}`).setLabel('❌ | Negar Registro').setStyle(ButtonStyle.Danger)
        );

        const msg = await canal.send({
          content: `<a:lupa:1389604951746941159> | Registro recebido de: <@${userId}>\n<:police:1389074817537278023> | <@&${CARGO_EQUIPE_GESTORA}>`,
          embeds: [embed],
          components: [row]
        });

        mensagensRegistro[userId] = msg.id;
        await interaction.editReply({ content: 'Registro enviado para análise com sucesso!' });
      }

      // Botão aceitar
      else if (interaction.isButton() && interaction.customId.startsWith('aceitar_')) {
        registrarLog('BOTAO_ACEITAR_CLICADO', interaction);

        const targetId = interaction.customId.split('_')[1];
        const dados = registrosTemporarios[targetId];
        if (!dados) {
          return interaction.reply({ content: 'Registro não encontrado.', ephemeral: true });
        }

        // Pergunta se deseja alterar nome
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`alterar_nome_${targetId}`)
          .setPlaceholder(`Deseja alterar o nome do usuário? Nome atual: ${dados.nome}`)
          .addOptions([
            {
              label: 'Manter nome',
              description: 'Usar o nome informado no registro',
              value: 'manter',
              emoji: '✅'
            },
            {
              label: 'Alterar nome',
              description: 'Digite um nome diferente',
              value: 'alterar',
              emoji: '✏️'
            }
          ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({ content: 'Deseja alterar o nome do usuário?', components: [row], ephemeral: true });
      }

      // Select menu para alterar nome
      else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('alterar_nome_')) {
        registrarLog('SELECAO_ALTERAR_NOME', interaction);

        const targetId = interaction.customId.split('_')[2];
        const dados = registrosTemporarios[targetId];
        if (!dados) return await interaction.reply({ content: '❌ Registro não encontrado.', ephemeral: true });

        const escolha = interaction.values[0];

        if (escolha === 'alterar') {
          const modal = new ModalBuilder()
            .setCustomId(`modal_nome_custom_${targetId}`)
            .setTitle('Nome Customizado')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('nome_custom')
                  .setLabel('Nome')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(true)
              )
            );

          // SEM deferReply ou editReply aqui
          await interaction.showModal(modal);

        } else {
          // manter nome original — abre menu de cargos
          const options = Object.entries(cargosPatentes).map(([nome, id]) => ({
            label: nome,
            value: id,
          }));

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`selecionar_cargo_${targetId}`)
            .setPlaceholder('Selecione a patente para aprovar o registro')
            .addOptions(options);

          const row = new ActionRowBuilder().addComponents(selectMenu);

          await interaction.reply({
            content: 'Selecione a patente para confirmar o registro:',
            components: [row],
            ephemeral: true
          });
        }
      }

      // Modal para nome customizado enviado
      else if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('modal_nome_custom_')) {
        registrarLog('MODAL_SUBMIT_NOME_CUSTOM', interaction);

        const targetId = interaction.customId.split('_')[3];
        const dados = registrosTemporarios[targetId];
        if (!dados) return interaction.reply({ content: '❌ Registro não encontrado.', ephemeral: true });

        const nomeCustom = interaction.fields.getTextInputValue('nome_custom');
        dados.nome = nomeCustom; // altera o nome no registro temporário

        // Abre o menu de seleção de cargo após alterar o nome
        const options = Object.entries(cargosPatentes).map(([nome, id]) => ({
          label: nome,
          value: id,
        }));

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`selecionar_cargo_${targetId}`)
          .setPlaceholder('Selecione a patente para aprovar o registro')
          .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
          content: `Nome alterado para **${nomeCustom}**. Agora selecione a patente para confirmar o registro:`,
          components: [row],
          ephemeral: true
        });
      }

      // Select menu de seleção de cargo
      else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('selecionar_cargo_')) {
        try {
          registrarLog('SELECAO_CARGO_FEITA', interaction);

          await interaction.deferReply({ ephemeral: true });

          const targetId = interaction.customId.split('_')[2];
          const dados = registrosTemporarios[targetId];
          if (!dados) return await interaction.editReply({ content: '❌ Registro não encontrado.', components: [] });

          const membro = await interaction.guild.members.fetch(targetId).catch(() => null);
          if (!membro) return await interaction.editReply({ content: '❌ Membro não encontrado.', components: [] });

          const cargoId = interaction.values[0];
          const patenteDefinida = Object.entries(cargosPatentes).find(([, id]) => id === cargoId)?.[0] || 'Desconhecida';

          // Remover cargos antigos
          const rolesToRemove = Object.values(cargosPatentes).filter(id => membro.roles.cache.has(id));
          const rolePromises = rolesToRemove.map(id => membro.roles.remove(id).catch(err => console.error(`Erro ao remover cargo ${id}:`, err)));

          // Adicionar o novo cargo
          rolePromises.push(membro.roles.add(cargoId).catch(err => console.error(`Erro ao adicionar cargo ${cargoId}:`, err)));

          if (CARGO_REGISTRADO) rolePromises.push(membro.roles.add(CARGO_REGISTRADO).catch(err => console.error(`Erro ao adicionar cargo REGISTRADO:`, err)));

          if (CARGO_ALTO_COMANDO && Object.values(cargosPatentes).slice(0, 7).includes(cargoId)) {
            rolePromises.push(membro.roles.add(CARGO_ALTO_COMANDO).catch(err => console.error(`Erro ao adicionar cargo ALTO_COMANDO:`, err)));
          }

          await Promise.all(rolePromises);

          // Alterar nickname
          const novoNick = `${patenteDefinida}.${dados.nome} | ${dados.id}`;
          await membro.setNickname(novoNick).catch(err => console.error(`Erro ao definir nickname para ${membro.id}:`, err));

          // Editar mensagem no canal de registro
          const canal = await client.channels.fetch(CANAL_REGISTROS_ID);
          const msg = await canal.messages.fetch(mensagensRegistro[targetId]);

          const embed = new EmbedBuilder()
            .setTitle('<:positive:1390174067218190347> | Registro Aprovado')
            .setColor('Green')
            .addFields(
              { name: '<:c_:1389391603415650326> | Nome (Informado)', value: dados.patenteInformada ? `${dados.patenteInformada} ${dados.nome}` : dados.nome },
              { name: '<:c_:1389391603415650326> | Nome (setado)', value: `${patenteDefinida} ${dados.nome}` },
              { name: '<:cmdgeral:1389391645748760689> | ID', value: dados.id },
              { name: '<:staff:1389391852909625377> | Patente (informada)', value: dados.patenteInformada },
              { name: '<:staff:1389391852909625377> | Patente (setada)', value: patenteDefinida },
              { name: '<a:fixclandst:1389998676805550182> | Recrutador', value: dados.recrutador },
              { name: '🔗 TS3', value: dados.ts3 },
              { name: '<:data:1389411249519071263> Data e Hora', value: formatarDataHora() },
              { name: 'Quem aceitou o registro', value: `${interaction.user}\n<@&${CARGO_EQUIPE_GESTORA}>` }
            )
            
            .setFooter({ text: 'registro aprovado' });

          await msg.edit({
            content: `<:positive:1390174067218190347> | Registro aprovado de: <@${targetId}>`,
            embeds: [embed],
            components: []
          });

          await interaction.editReply({ content: '✅ Registro aprovado com sucesso!', components: [] });

          delete registrosTemporarios[targetId];
          delete mensagensRegistro[targetId];
        } catch (error) {
          console.error('Erro no select menu:', error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Erro ao processar a seleção.', ephemeral: true });
          } else {
            await interaction.editReply({ content: '❌ Erro ao processar a seleção.' });
          }
        }
      }

      // Botão recusar
      else if (interaction.isButton() && interaction.customId.startsWith('recusar_')) {
        registrarLog('BOTAO_RECUSAR_CLICADO', interaction);
        const targetId = interaction.customId.split('_')[1];
        const modal = new ModalBuilder()
          .setCustomId(`motivo_recusa_${targetId}`)
          .setTitle('Motivo da Recusa')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('motivo').setLabel('Motivo').setStyle(TextInputStyle.Paragraph).setRequired(true)
            )
          );
        await interaction.showModal(modal);
      }

      // Modal motivo recusa enviado
      else if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('motivo_recusa_')) {
        registrarLog('MODAL_SUBMIT_REJEICAO', interaction);
        await interaction.deferReply({ ephemeral: true });

        const targetId = interaction.customId.split('_')[2];
        const motivo = interaction.fields.getTextInputValue('motivo');
        const dados = registrosTemporarios[targetId];

        if (!dados) return interaction.editReply({ content: '❌ Registro não encontrado.' });
        if (!mensagensRegistro[targetId]) return interaction.editReply({ content: '❌ Mensagem do registro não foi encontrada.' });

        const canal = await client.channels.fetch(CANAL_REGISTROS_ID);
        const msg = await canal.messages.fetch(mensagensRegistro[targetId]);

        const embed = new EmbedBuilder()
          .setTitle('<:negative:1390174962005839942> | Registro Recusado')
          .setColor('Red')
          .addFields(
            { name: '<:c_:1389391603415650326> | Nome', value: dados.nome },
            { name: '<:cmdgeral:1389391645748760689> | ID', value: dados.id },
            { name: '<:staff:1389391852909625377> | Patente', value: dados.patenteInformada },
            { name: '<a:fixclandst:1389998676805550182> | Recrutador', value: dados.recrutador },
            { name: '🔗 TS3', value: dados.ts3 },
            { name: '<a:c_warningrgbFXP:1390000774863519765> Motivo', value: motivo },
            { name: '<:data:1389411249519071263> Data e Hora', value: formatarDataHora() },
            { name: 'Quem negou o registro', value: `${interaction.user}\n<@&${CARGO_EQUIPE_GESTORA}>` }
          )
          .setFooter({ text: 'registro negado' });

        await msg.edit({
          content: `<:negative:1390174962005839942> | Registro recusado de: <@${targetId}>`,
          embeds: [embed],
          components: []
        });

        await interaction.editReply({ content: 'Registro recusado com sucesso.', components: [] });

        delete registrosTemporarios[targetId];
        delete mensagensRegistro[targetId];
      }

    } catch (err) {
      console.error('[ERRO tratarInteracao]:', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Ocorreu um erro.', ephemeral: true });
      }
    }
  }
};
