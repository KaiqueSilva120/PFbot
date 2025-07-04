// sistemas/atendimento.js 
const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  StringSelectMenuBuilder, 
  ChannelType, 
  ButtonStyle 
} = require('discord.js'); 

let CARGO_EQUIPE_GESTORA_ID; 
let GUILD_ID; 
let log; 

const ticketsMap = new Map(); 

const atendimentoMenu = new StringSelectMenuBuilder() 
  .setCustomId('atendimento_menu') 
  .setPlaceholder('Selecione o tipo de atendimento') 
  .addOptions([ 
    { 
      label: 'Suporte Geral', 
      description: 'Para dúvidas gerais e suporte', 
      emoji: '<:WDcStaff:1389418577232269414>', 
      value: 'suporte_geral', 
    }, 
    { 
      label: 'Dúvidas', 
      description: 'Esclareça suas dúvidas', 
      emoji: '<a:lupa:1389604951746941159>', 
      value: 'duvidas', 
    }, 
    { 
      label: 'Upamentos', 
      description: 'Solicitar upamentos e promoções', 
      emoji: '<:ncrp_add:1389417398880436357>', 
      value: 'upamentos', 
    }, 
    { 
      label: 'Bugs', 
      description: 'Reportar bugs e erros', 
      emoji: '🐞', 
      value: 'bugs', 
    }, 
    { 
      label: 'Denúncias de membros', 
      description: 'Reportar problemas com membros', 
      emoji: '<a:c_warningrgbFXP:1390000774863519765>', 
      value: 'denuncias', 
    }, 
  ]); 

const atendimentoRow = new ActionRowBuilder().addComponents(atendimentoMenu); 

function criarViewBotoesTicket(autorId) { 
  return new ActionRowBuilder().addComponents( 
    new ButtonBuilder() 
      .setCustomId('fechar_ticket') 
      .setLabel('🔐 Fechar Ticket') 
      .setStyle(ButtonStyle.Danger), 
    new ButtonBuilder() 
      .setCustomId('notificar_equipe') 
      .setLabel('🔔 Notificar Equipe') 
      .setStyle(ButtonStyle.Primary), 
    new ButtonBuilder() 
      .setCustomId('notificar_membro') 
      .setLabel('🔎 Notificar Membro') 
      .setStyle(ButtonStyle.Secondary) 
  ); 
} 

async function initAtendimento(client, config) { 
  CARGO_EQUIPE_GESTORA_ID = config.CARGO_EQUIPE_GESTORA; 
  GUILD_ID = config.GUILD_ID; 
  log = config.log || console.log; 

  const canalAtendimento = await client.channels.fetch('1388925478491918427'); 
  if (!canalAtendimento) { 
    log('[ATENDIMENTO] Canal fixo de atendimento não encontrado'); 
    return; 
  } 

  const mensagens = await canalAtendimento.messages.fetch({ limit: 50 }); 
  const mensagemExiste = mensagens.find(m => { 
    if (!m.embeds?.length) return false; 
    const embed = m.embeds[0]; 
    return ( 
      embed.title === '📞 Painel de Atendimento - Polícia Federal' && 
      embed.color === 0x0055ff 
    ); 
  }); 

  if (mensagemExiste) { 
    log('[ATENDIMENTO] Mensagem fixa já existe no canal'); 
    return; 
  } 

  const embedPainel = new EmbedBuilder() 
    .setTitle('📞 Painel de Atendimento - Polícia Federal') 
    .setDescription( 
      'Selecione abaixo o tipo de atendimento que deseja para abrir seu ticket.\n\n' + 
      '**Importante:** Pedimos que tenha paciência e aguarde o atendimento da nossa equipe.' 
    ) 
    .setColor(0x0055ff) 
    .setImage('https://cdn.discordapp.com/attachments/1242690408782495757/1390159361829109760/atendimento_pf.png'); 

  await canalAtendimento.send({ embeds: [embedPainel], components: [atendimentoRow] }); 
  log('[ATENDIMENTO] Mensagem fixa enviada no canal de atendimento'); 
} 

async function handleAtendimentoMenu(interaction, client) { 
  await interaction.deferReply({ ephemeral: true }); 

  const userId = interaction.user.id; 
  const userName = interaction.user.username; 
  const tipo = interaction.values[0]; 

  const nomeThread = `ticket-${tipo}-${userName}`; 

  try { 
    const thread = await interaction.channel.threads.create({ 
      name: nomeThread, 
      autoArchiveDuration: 10080, 
      type: ChannelType.PrivateThread, 
    }); 

    await thread.members.add(userId); 

    const guild = await client.guilds.fetch(GUILD_ID); 
    const equipe = await guild.roles.fetch(CARGO_EQUIPE_GESTORA_ID); 
    
    for (const membro of equipe.members.values()) { 
      try {
        await thread.members.add(membro.id); 
      } catch (e) {
        if (e.code === 10007) { 
          log(`[ATENDIMENTO] Membro ${membro.id} não encontrado ou já está na thread: ${e.message}`);
        } else {
          console.error(`[ATENDIMENTO] Erro ao adicionar membro ${membro.id} à thread:`, e);
        }
      }
    } 

    ticketsMap.set(thread.id, userId); 

    const embedTicket = new EmbedBuilder() 
      .setTitle(`🛎️ Ticket - ${tipo.replace('_', ' ')}`) 
      .setDescription( 
        `Olá <@${userId}>, sua solicitação foi criada.\n\n` + 
        `Nossa equipe <@&${CARGO_EQUIPE_GESTORA_ID}> irá atendê-lo o mais breve possível.\n` + 
        'Use os botões abaixo para ações no ticket.' 
      ) 
      .setColor(0x0055ff); 

    await thread.send({ embeds: [embedTicket], components: [criarViewBotoesTicket(userId)] }); 

    await interaction.editReply({ 
      content: `✅ Seu ticket foi criado: ${thread.toString()}`, 
      ephemeral: true, 
    }); 

    log(`[ATENDIMENTO] Ticket criado: ${nomeThread} por ${interaction.user.tag}`); 
  } catch (error) { 
    console.error('[ATENDIMENTO] Erro ao criar ticket:', error); 
    await interaction.editReply({ 
      content: '❌ Ocorreu um erro ao criar seu ticket. Tente novamente mais tarde.', 
      ephemeral: true, 
    }); 
  } 
} 

async function handleTicketButtons(interaction, client) { 
  await interaction.deferUpdate(); 

  if (!interaction.channel.isThread()) { 
    await interaction.followUp({ content: 'Esse botão só funciona dentro de um ticket.', ephemeral: true }); 
    return; 
  } 

  const thread = interaction.channel; 
  const userId = interaction.user.id; 
  const autorId = ticketsMap.get(thread.id); 

  if (!autorId) { 
    await interaction.followUp({ 
      content: '❌ Autor do ticket não encontrado. O bot pode ter reiniciado.', 
      ephemeral: true, 
    }); 
    return; 
  } 

  const guild = await client.guilds.fetch(GUILD_ID); 
  const membro = await guild.members.fetch(userId); 
  const isEquipe = membro.roles.cache.has(CARGO_EQUIPE_GESTORA_ID); 
  const isAutor = userId === autorId; 

  if (!isAutor && !isEquipe && !['reabrir_ticket', 'excluir_topico'].includes(interaction.customId)) { 
    await interaction.followUp({ content: '❌ Você não tem permissão para isso.', ephemeral: true }); 
    return; 
  } 

  if (interaction.customId === 'fechar_ticket') { 
    if (thread.name.startsWith('fechado-')) {
        await interaction.followUp({ content: 'Este ticket já está fechado.', ephemeral: true });
        return;
    }

    const embedFechar = new EmbedBuilder() 
      .setTitle('🔒 Ticket fechado') 
      .setDescription(`Este ticket foi fechado por <@${userId}>.`) 
      .setColor(0xff0000); 

    const acoesEquipeRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('reabrir_ticket')
          .setLabel('Reabrir Ticket')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔓'), 
        new ButtonBuilder()
          .setCustomId('excluir_topico')
          .setLabel('Excluir Tópico')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️') 
      );

    await thread.send({ embeds: [embedFechar], components: [acoesEquipeRow] }); 
    await thread.setName(`fechado-${thread.name}`); 
    await thread.setArchived(true); 
    await thread.setLocked(true); 
    await interaction.followUp({ content: '✅ Ticket fechado com sucesso.', ephemeral: true }); 
    log(`[ATENDIMENTO] Ticket fechado: ${thread.name} por ${interaction.user.tag}`); 
  } 

  else if (interaction.customId === 'notificar_equipe') { 
    await thread.send(`<@&${CARGO_EQUIPE_GESTORA_ID}> Um membro solicitou notificação.`); 
    await interaction.followUp({ content: '✅ Equipe notificada.', ephemeral: true }); 
  } 

  else if (interaction.customId === 'notificar_membro') { 
    if (!isEquipe) { 
      await interaction.followUp({ content: '❌ Apenas a equipe gestora pode notificar o membro.', ephemeral: true }); 
      return; 
    } 
    await thread.send(`Você foi notificado pela equipe.`); 
    await interaction.followUp({ content: '✅ Membro notificado.', ephemeral: true }); 
  } 

  // Lógica para Reabrir Ticket
  else if (interaction.customId === 'reabrir_ticket') {
    if (!isEquipe) { 
      await interaction.followUp({ content: '❌ Você não tem permissão para reabrir tickets. Apenas a equipe gestora pode fazer isso.', ephemeral: true });
      return;
    }
    
    if (!thread.name.startsWith('fechado-')) {
        await interaction.followUp({ content: 'Este ticket não está fechado.', ephemeral: true });
        return;
    }

    try {
        const newThreadName = thread.name.replace('fechado-', ''); 
        await thread.setName(newThreadName);
        await thread.setArchived(false); 
        await thread.setLocked(false);   

        await interaction.message.edit({ components: [] }); // Remove os botões da mensagem de "fechado"

        // === ALTERAÇÃO AQUI: REMOVIDOS OS COMPONENTES DA MENSAGEM DE REABERTURA ===
        await thread.send({ 
            content: `🔓 Ticket reaberto por <@${userId}>.`
        });
        log(`[ATENDIMENTO] Ticket ${thread.name} reaberto por ${interaction.user.tag}`);
    } catch (error) {
        console.error('[ATENDIMENTO] Erro ao reabrir ticket:', error);
        await interaction.followUp({ content: '❌ Ocorreu um erro ao reabrir o ticket.', ephemeral: true });
    }
  }

  // Lógica para Excluir Tópico
  else if (interaction.customId === 'excluir_topico') {
    if (!isEquipe) { 
      await interaction.followUp({ content: '❌ Você não tem permissão para excluir tópicos. Apenas a equipe gestora pode fazer isso.', ephemeral: true });
      return;
    }

    try {
        await thread.send(`🗑️ Este ticket será excluído permanentemente em 10 segundos por <@${userId}>.`);
        log(`[ATENDIMENTO] Ticket ${thread.name} será excluído por ${interaction.user.tag}`);
        setTimeout(async () => {
            await thread.delete();
            log(`[ATENDIMENTO] Ticket ${thread.name} excluído.`);
        }, 10000); 
    } catch (error) {
        console.error('[ATENDIMENTO] Erro ao excluir ticket:', error);
        await interaction.followUp({ content: '❌ Ocorreu um erro ao excluir o ticket.', ephemeral: true });
    }
  }
} 

module.exports = { 
  initAtendimento, 
  handleAtendimentoMenu, 
  handleTicketButtons 
};