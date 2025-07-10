const {
  ChannelType,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

// IDs dos canais, categorias e cargos do Discord
const canalFixoID = '1391576246575435949'; // Canal onde o botão de iniciar edital será enviado
const categoriaID = '1392235600979169430'; // Categoria onde os canais de edital serão criados
const canalAnaliseID = '1392235632859808037'; // Canal para onde os editais finalizados serão enviados para análise
const cargoGestoraID = '1389346922300571739'; // Cargo que terá permissão para ver e gerenciar os editais
const cargoAprovadoID = '1391600983276130378'; // Cargo a ser adicionado ao usuário após aprovação

// Array de perguntas do edital
const perguntas = [
  { chave: 'nome', pergunta: '1° Qual seu nome?' },
  { chave: 'rg', pergunta: '2° Qual seu RG? (In Game)' },
  { chave: 'genero', pergunta: '3° Qual seu gênero? (Homem ou Mulher)' },
  { chave: 'idade', pergunta: '4° Qual sua Idade? (FRP)' },
  { chave: 'corp', pergunta: '5° Já foi de alguma corp? Se Sim, Qual?' },
  { chave: 'data', pergunta: '6° Qual data você está fazendo o edital?' },
  { chave: 'radio', pergunta: '7° Qual rádio é obrigatório entrar ao iniciar o patrulhamento?\n190 / 191 / 193 / 197' },
  { chave: 'qs', pergunta: '8° Tem conhecimento em códigos Q? Se sim, Informe 2 e seus significados' },
  { chave: 'hora', pergunta: '9° Qual é o mínimo de horas de patrulhamento para o relatório ser aceito?\n1h / 2h / 3h / 7h' },
  { chave: 'dm', pergunta: '10° O que é Deathmatch (DM)?' },
  { chave: 'pg', pergunta: '11° O que é Power Gaming (PG)?' },
  { chave: 'occ', pergunta: '12° O que é Out of Character (OCC)?' },
  { chave: 'motivo', pergunta: '13° Por quais motivos você deveria ser aceito na Policia Federal?' },
];

// Cache para armazenar dados dos editais em andamento
const cacheEditais = new Map();

/**
 * Avalia as respostas do usuário com base em critérios predefinidos.
 * @param {Object} respostas - Objeto contendo as respostas do usuário.
 * @returns {number} O número de acertos.
 */
function avaliarRespostas(respostas) {
  let acertos = 0;
  // Validação do nome: deve ter pelo menos 1 palavra
  if (respostas.nome && respostas.nome.trim().split(/\s+/).length >= 1) acertos++;
  // Validação do RG: deve ser numérico, opcionalmente com '/'
  if (respostas.rg && /^\d+(\/\d+)?$/.test(respostas.rg.trim())) acertos++;
  // Validação do gênero: deve ser 'homem' ou 'mulher'
  if (respostas.genero && ['homem', 'mulher'].includes(respostas.genero.toLowerCase())) acertos++;
  // Validação da idade: deve ser um número entre 14 e 70
  const idade = Number(respostas.idade);
  if (respostas.idade && idade >= 14 && idade <= 70) acertos++;
  // Validação da corp: não deve ser vazia
  if (respostas.corp && respostas.corp.trim().length > 0) acertos++;
  // Validação da data: formato DD/MM ou DD/MM/YYYY
  if (respostas.data && /^\d{2}\/\d{2}(\/\d{4})?$/.test(respostas.data.trim())) acertos++;
  // Validação do rádio: deve ser '190'
  if (respostas.radio && respostas.radio.trim() === '190') acertos++;
  // Validação dos códigos Q: deve ter mais de 5 caracteres (indicando alguma resposta)
  if (respostas.qs && respostas.qs.trim().length > 5) acertos++;
  // Validação das horas: deve conter '1'
  if (respostas.hora && respostas.hora.toLowerCase().includes('1')) acertos++;
  // Validação de DM: deve conter 'matar' e 'motivo'
  if (respostas.dm && /matar.*motivo/.test(respostas.dm.toLowerCase())) acertos++;
  // Validação de PG: deve conter 'imposs' ou 'real'
  if (respostas.pg && /(imposs|real)/.test(respostas.pg.toLowerCase())) acertos++;
  // Validação de OCC: deve conter 'fora' e ('personagem' ou 'rp')
  if (respostas.occ && /(fora.*personagem|fora.*rp)/.test(respostas.occ.toLowerCase())) acertos++;
  // Validação do motivo: deve ter pelo menos 10 palavras
  if (respostas.motivo && respostas.motivo.trim().split(' ').length >= 10) acertos++;
  return acertos;
}

/**
 * Gera um motivo para a sugestão da IA com base nas respostas incorretas.
 * @param {Object} respostas - Objeto contendo as respostas do usuário.
 * @returns {string} Uma string com os motivos de reprovação, se houver.
 */
function motivoIA(respostas) {
  const motivos = [];
  // Verifica se o nome é inválido
  if (!respostas.nome || respostas.nome.trim().split(/\s+/).length < 1) motivos.push('Nome inválido');
  // Verifica se o RG é inválido
  if (!respostas.rg || !/^\d+(\/\d+)?$/.test(respostas.rg.trim())) motivos.push('RG inválido');
  // Verifica se o gênero é inválido
  if (!respostas.genero || !['homem', 'mulher'].includes(respostas.genero.toLowerCase())) motivos.push('Gênero inválido');
  // Verifica se a idade é inválida
  const idade = Number(respostas.idade);
  if (!respostas.idade || idade < 14 || idade > 70) motivos.push('Idade inválida');
  // Verifica se a corp está ausente
  if (!respostas.corp || respostas.corp.trim().length === 0) motivos.push('Corp ausente');
  // Verifica se a data é inválida
  if (!respostas.data || !/^\d{2}\/\d{2}(\/\d{4})?$/.test(respostas.data.trim())) motivos.push('Data inválida');
  // Verifica se o rádio está incorreto
  if (!respostas.radio || respostas.radio.trim() !== '190') motivos.push('Rádio incorreto');
  // Verifica se os códigos Q estão incompletos
  if (!respostas.qs || respostas.qs.trim().length < 5) motivos.push('Códigos Q incompletos');
  // Verifica se as horas estão incorretas
  if (!respostas.hora || !respostas.hora.toLowerCase().includes('1')) motivos.push('Horas incorretas');
  // Verifica se a definição de DM está incorreta
  if (!respostas.dm || !/matar.*motivo/.test(respostas.dm.toLowerCase())) motivos.push('DM incorreto');
  // Verifica se a definição de PG está incorreta
  if (!respostas.pg || !/(imposs|real)/.test(respostas.pg.toLowerCase())) motivos.push('PG incorreto');
  // Verifica se a definição de OCC está incorreta
  if (!respostas.occ || !/(fora.*personagem|fora.*rp)/.test(respostas.occ.toLowerCase())) motivos.push('OCC incorreto');
  // Verifica se o motivo pessoal é insuficiente
  if (!respostas.motivo || respostas.motivo.trim().split(' ').length < 10) motivos.push('Motivo pessoal insuficiente');
  return motivos.length ? motivos.join('; ') : 'Nenhum erro detectado';
}

module.exports = {
  /**
   * Inicializa o módulo, enviando a mensagem de edital para o canal fixo.
   * @param {Client} client - O cliente Discord.
   */
  init: async (client) => {
    const canal = await client.channels.fetch(canalFixoID).catch(() => null);
    if (!canal) return;

    // Obtém o objeto Guild a partir do canal para pegar o ícone do servidor
    const guild = canal.guild;
    const guildIcon = guild.iconURL(); // URL do ícone do servidor

    // Verifica se já existe uma mensagem de edital para evitar duplicatas
    const mensagens = await canal.messages.fetch({ limit: 10 }).catch(() => null);
    const jaExiste = mensagens.find(m => m.author.id === client.user.id && m.components.length > 0);
    if (jaExiste) return;

    // Cria o embed do edital
    const embed = new EmbedBuilder()
      .setTitle('<:avisos:1392886752737235127> Edital de Convocação — Polícia Federal')
      .setImage('https://cdn.discordapp.com/attachments/857263560831664201/1391581083916697692/Edital.png') // Imagem principal
      .setThumbnail(guildIcon) // Ícone do servidor como thumbnail
      .setDescription(`<a:seta:1389391513745887353> **Atenção, candidatos!**
Está aberto o novo edital da Polícia Federal! Confira abaixo as informações importantes e participe da seleção.

<:Sv_Icon_Rules:1390467599724318742> **Período de Inscrição:**
08/07/2025 a 22/07/2025

📝 **Etapas do Processo:**
• Análise de Perfil
• Entrevista
• Curso de Formação

<a:fixclandst:1389998676805550182> **Requisitos:**
• Maior de 18 anos
• Conhecimento das regras da cidade
• Estar regular no servidor
• Disponibilidade mínima de 7h/semana

<a:c_warningrgbFXP:1390000774863519765> **Importante:**
A ausência em qualquer etapa implicará em desclassificação automática.

<:cmdgeral:1389391645748760689> Para iniciar o edital, clique no botão abaixo.`)
      .setColor('#ffc107');

    // Cria o botão para iniciar o edital
    const botao = new ButtonBuilder()
      .setCustomId('iniciar_edital')
      .setLabel('📥 Iniciar Edital')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(botao);
    await canal.send({ embeds: [embed], components: [row] });
  },

  /**
   * Lida com a interação de iniciar o edital, criando um canal temporário.
   * @param {ButtonInteraction} interaction - A interação do botão.
   * @param {Client} client - O cliente Discord.
   * @returns {boolean} True se a interação foi tratada, false caso contrário.
   */
  handleRealizarEdital: async (interaction, client) => {
    if (interaction.customId !== 'iniciar_edital') return false;

    const guild = interaction.guild;
    const user = interaction.user;

    // Cria um novo canal de texto para o edital
    const canal = await guild.channels.create({
      name: `edital-${user.username}`.toLowerCase(),
      type: ChannelType.GuildText,
      parent: categoriaID,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, // Ninguém vê por padrão
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }, // Usuário pode ver e enviar mensagens
        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }, // Bot pode ver e enviar mensagens
        { id: cargoGestoraID, allow: [PermissionFlagsBits.ViewChannel] }, // Gestores podem ver
      ],
    });

    // Embed de instruções para o edital
    const embed = new EmbedBuilder()
      .setTitle('📝 Instruções do Edital')
      .setDescription(`Você está prestes a iniciar o edital da Polícia Federal.
Responda com **seriedade**. Respostas falsas, brincadeiras ou uso de **inteligência artificial** podem causar **desclassificação imediata**.

Clique no botão abaixo para começar.`)
      .setColor('#f9a825');

    // Botão para começar o edital
    const btn = new ButtonBuilder()
      .setCustomId('comecar_edital')
      .setLabel('✅ Começar Edital')
      .setStyle(ButtonStyle.Primary);

    await canal.send({ content: `<@${user.id}>`, embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
    await interaction.reply({ content: `Canal criado: ${canal}`, ephemeral: true });
    return true;
  },

  /**
   * Lida com a interação de enviar o edital, guiando o usuário pelas perguntas.
   * @param {ButtonInteraction} interaction - A interação do botão.
   * @param {Client} client - O cliente Discord.
   * @returns {boolean} True se a interação foi tratada, false caso contrário.
   */
  handleEnviarEdital: async (interaction, client) => {
    if (interaction.customId !== 'comecar_edital') return false;

    const canal = interaction.channel;
    const user = interaction.user;
    const respostas = {};
    const totalPerguntas = perguntas.length;
    let indexAtual = 0;

    await interaction.deferUpdate(); // Defer a atualização para não mostrar "bot pensando"

    /**
     * Envia a próxima pergunta ao usuário.
     */
    async function fazerPergunta() {
      if (indexAtual >= totalPerguntas) {
        return finalizarEdital(); // Todas as perguntas foram respondidas
      }

      const perguntaAtual = perguntas[indexAtual];
      const msgPergunta = await canal.send(`**${perguntaAtual.pergunta}**`);

      // Coletor de mensagens para a resposta do usuário
      const coletor = canal.createMessageCollector({
        filter: m => m.author.id === user.id,
        max: 1,
        time: 120000, // 2 minutos para responder
      });

      coletor.on('collect', async m => {
        respostas[perguntaAtual.chave] = m.content.trim();
        indexAtual++;
        // Pequeno atraso para apagar as mensagens e enviar a próxima pergunta
        setTimeout(async () => {
          await msgPergunta.delete().catch(() => {});
          await m.delete().catch(() => {});
          fazerPergunta();
        }, 700);
      });

      coletor.on('end', c => {
        if (c.size === 0) {
          // Se o tempo esgotou e nenhuma resposta foi coletada
          canal.send('⛔ Tempo esgotado. Refaça o edital.');
        }
      });
    }

    /**
     * Finaliza o processo do edital, enviando para análise.
     */
    async function finalizarEdital() {
      // Apaga as últimas mensagens do canal para limpar
      await canal.bulkDelete(5).catch(() => {});

      const acertos = avaliarRespostas(respostas);
      const porcentagem = Math.round((acertos / totalPerguntas) * 100);
      const sugestao = porcentagem >= 70 ? '✅ APROVAR' : '❌ NEGAR';
      const motivoDaIA = motivoIA(respostas);

      // Embed para o canal de análise
      const embedAnalise = new EmbedBuilder()
        .setTitle('📄 Novo Edital em Análise')
        .setDescription(`Edital realizado por: <@${user.id}>\nCanal do edital: ${canal}`)
        .addFields(
          { name: '📊 Análise Automática', value: `**Porcentagem:** ${porcentagem}%\n**Sugestão:** ${sugestao}\n**Motivo:** ${motivoDaIA}` },
          { name: '📋 Respostas Completas', value: perguntas.map(p => `**${p.pergunta}**\n${respostas[p.chave] || 'Não respondido'}`).join('\n\n') }
        )
        .setColor('#fbc02d')
        .setFooter({ text: 'Status: Em Análise' });

      // Botões de aprovar/reprovar para os gestores
      const rowAcoes = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder().setCustomId(`aprovar_${user.id}`).setLabel('✅ Aprovar').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`reprovar_${user.id}`).setLabel('❌ Reprovar').setStyle(ButtonStyle.Danger)
        );

      const canalAnalise = await client.channels.fetch(canalAnaliseID);
      const mensagemAnalise = await canalAnalise.send({ content: `<@&${cargoGestoraID}>`, embeds: [embedAnalise], components: [rowAcoes] });

      // Armazena os dados do edital no cache
      cacheEditais.set(user.id, {
        respostas,
        canalID: canal.id,
        mensagemAnalise: mensagemAnalise,
        porcentagem,
        motivoIA: motivoDaIA
      });

      // Mensagem de status para o usuário no canal do edital
      await canal.send({
        content: `<@${user.id}>`,
        embeds: [
          new EmbedBuilder()
            .setDescription('<a:info:1390483277240074262> **STATUS: ANÁLISE**\n<a:fixclandst:1389998676805550182> Aguarde a análise da equipe.')
            .setColor('#ffeb3b')
        ]
      });
      return true;
    }

    fazerPergunta(); // Inicia o processo de perguntas
    return true;
  },

  /**
   * Lida com a aceitação ou recusa de um edital pelos gestores.
   * @param {ButtonInteraction} interaction - A interação do botão.
   * @param {Client} client - O cliente Discord.
   * @returns {boolean} True se a interação foi tratada, false caso contrário.
   */
  handleAceitarRecusarEdital: async (interaction, client) => {
    const customId = interaction.customId;
    if (!customId.startsWith('aprovar_') && !customId.startsWith('reprovar_')) return false;

    const usuarioId = customId.split('_')[1];
    const dadosEdital = cacheEditais.get(usuarioId);
    if (!dadosEdital) {
      await interaction.reply({ content: 'Dados do edital não encontrados no cache.', ephemeral: true });
      return false;
    }

    const membro = await interaction.guild.members.fetch(usuarioId).catch(() => null);
    const canalEdital = await interaction.guild.channels.fetch(dadosEdital.canalID).catch(() => null);

    if (customId.startsWith('aprovar_')) {
      // Adiciona o cargo de aprovado ao membro
      await membro.roles.add(cargoAprovadoID).catch(() => {});

      // Atualiza o embed no canal de análise
      const embedAnaliseAtualizado = EmbedBuilder.from(dadosEdital.mensagemAnalise.embeds[0])
        .setColor('Green')
        .addFields(
          { name: 'Edital aprovado por:', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Data:', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        );

      await dadosEdital.mensagemAnalise.edit({ embeds: [embedAnaliseAtualizado], components: [] });

      // Buscar a mensagem enviada originalmente no canal do edital e editá-la
      if (canalEdital) {
        const mensagensCanal = await canalEdital.messages.fetch({ limit: 10 });
        const msgOriginal = mensagensCanal.find(m => m.author.id === client.user.id && m.embeds.length > 0);

        if (msgOriginal) {
          const embedEditado = EmbedBuilder.from(msgOriginal.embeds[0])
            .setColor('Green')
            .setTitle('✅ STATUS: APROVADO')
            .setDescription('Seu Edital foi aprovado, Aguarde as próximas instruções da equipe nesse canal.');

          await msgOriginal.edit({ content: `<@${usuarioId}>`, embeds: [embedEditado], components: [] });
        }
        await canalEdital.setName(`aprovado-${membro.user.username}`.toLowerCase()).catch(() => {});
      }

      // Envia mensagem privada ao usuário
      await membro.send(
        `**Olá, ${membro.user.username} 👋**\n\n` +
        `Seu edital na **Polícia Federal - CMRP** foi **aprovado** com sucesso.\n\n` +
        `📋 Aguardamos você para a próxima etapa do recrutamento. Fique atento às instruções da equipe.\n\n` +
        `Atenciosamente,\n**Gestão Polícia Federal | CMRP** <:police:1389074817537278023>`
      ).catch(() => {});

      await interaction.reply({ content: 'Edital aprovado com sucesso.', ephemeral: true });
      cacheEditais.delete(usuarioId); // Remove do cache
      return true;
    } else if (customId.startsWith('reprovar_')) {
      // Exibe um modal para o gestor inserir o motivo da reprovação
      const modal = new ModalBuilder()
        .setCustomId(`motivo_reprovar_${usuarioId}`)
        .setTitle('Motivo da Reprovação')
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('motivo')
            .setLabel('Informe o motivo da reprovação')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        ));
      await interaction.showModal(modal);
      return true;
    }

    return false;
  },

  /**
   * Lida com a submissão do modal de reprovação.
   * @param {ModalSubmitInteraction} interaction - A interação do modal.
   * @param {Client} client - O cliente Discord.
   * @returns {boolean} True se a interação foi tratada, false caso contrário.
   */
  tratarModal: async (interaction, client) => {
    if (!interaction.customId.startsWith('motivo_reprovar_')) return false;

    const usuarioId = interaction.customId.split('_')[2];
    const motivoReprovacao = interaction.fields.getTextInputValue('motivo');
    const dadosEdital = cacheEditais.get(usuarioId);

    if (!dadosEdital) {
      await interaction.reply({ content: 'Dados do edital não encontrados no cache.', ephemeral: true });
      return false;
    }

    const membro = await interaction.guild.members.fetch(usuarioId).catch(() => null);
    const canalEdital = await interaction.guild.channels.fetch(dadosEdital.canalID).catch(() => null);

    // Atualiza o embed no canal de análise com o motivo da reprovação
    const embedAnaliseAtualizado = EmbedBuilder.from(dadosEdital.mensagemAnalise.embeds[0])
      .setColor('Red')
      .addFields(
        { name: 'Edital recusado por:', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Motivo:', value: motivoReprovacao, inline: true },
        { name: 'Data:', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      );

    await dadosEdital.mensagemAnalise.edit({ embeds: [embedAnaliseAtualizado], components: [] });

    // Buscar a mensagem enviada originalmente no canal do edital e editá-la para reprovação
    if (canalEdital) {
      const mensagensCanal = await canalEdital.messages.fetch({ limit: 10 });
      const msgOriginal = mensagensCanal.find(m => m.author.id === client.user.id && m.embeds.length > 0);

      if (msgOriginal) {
        const embedEditado = EmbedBuilder.from(msgOriginal.embeds[0])
          .setColor('Red')
          .setTitle('❌ STATUS: REPROVADO')
          .setDescription(`Seu Edital foi reprovado, Analise o motivo em que foi negado e estude sobre.`);
        // Adiciona os campos de motivo e data ao embed editado
        embedEditado.addFields(
          { name: 'Motivo:', value: motivoReprovacao, inline: true },
          { name: 'Data:', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        );


        await msgOriginal.edit({ content: `<@${usuarioId}>`, embeds: [embedEditado], components: [] });
      }
      await canalEdital.setName(`negado-${membro.user.username}`).catch(() => {});
    }

    // Remove o cargo de aprovado, caso o usuário o tenha
    await membro.roles.remove(cargoAprovadoID).catch(() => {});

    // Envia mensagem privada ao usuário
    await membro.send(
      `**Olá, ${membro.user.username} 👋**\n\n` +
      `Seu edital na **Polícia Federal - CMRP** foi **reprovado**.\n\n` +
      `📋 Aguardamos você para a próxima etapa do recrutamento se quiser tentar novamente.\n` +
      `Motivo: **${motivoReprovacao}**\n\n` +
      `Atenciosamente,\n**Gestão Polícia Federal | CMRP** <:police:1389074817537278023>`
    ).catch(() => {});

    await interaction.reply({ content: 'Edital recusado com sucesso.', ephemeral: true });
    cacheEditais.delete(usuarioId); // Remove do cache
    return true;
  },
};
