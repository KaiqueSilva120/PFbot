else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('selecionar_cargo_')) {
  registrarLog('SELECAO_CARGO_FEITA', interaction);

  // Deferir a resposta para evitar timeout e permitir edição depois
  await interaction.deferReply({ ephemeral: true });

  const targetId = interaction.customId.split('_')[2];
  const dados = registrosTemporarios[targetId];
  if (!dados) return interaction.editReply({ content: '❌ Registro não encontrado.', components: [] });

  const membro = await interaction.guild.members.fetch(targetId).catch(() => null);
  if (!membro) return interaction.editReply({ content: '❌ Membro não encontrado.', components: [] });

  const cargoId = interaction.values[0];
  const patenteDefinida = Object.entries(cargosPatentes).find(([, id]) => id === cargoId)?.[0] || 'Desconhecida';

  // Remove cargos antigos e adiciona novos
  const rolesToRemove = Object.values(cargosPatentes).filter(id => membro.roles.cache.has(id));
  const rolePromises = rolesToRemove.map(id => membro.roles.remove(id).catch(err => console.error(`Erro ao remover cargo ${id}:`, err)));

  rolePromises.push(membro.roles.add(cargoId).catch(err => console.error(`Erro ao adicionar cargo ${cargoId}:`, err)));

  if (CARGO_REGISTRADO) rolePromises.push(membro.roles.add(CARGO_REGISTRADO).catch(err => console.error(`Erro ao adicionar cargo REGISTRADO:`, err)));

  // Se o cargo for de alto comando, adiciona o cargo especial
  if (CARGO_ALTO_COMANDO && Object.values(cargosPatentes).slice(0, 7).includes(cargoId)) {
    rolePromises.push(membro.roles.add(CARGO_ALTO_COMANDO).catch(err => console.error(`Erro ao adicionar cargo ALTO_COMANDO:`, err)));
  }

  await Promise.all(rolePromises);

  // Atualiza nickname
  const novoNick = `${patenteDefinida}.${dados.nome} | ${dados.id}`;
  await membro.setNickname(novoNick).catch(err => console.error(`Erro ao definir nickname para ${membro.id}:`, err));

  // Atualiza mensagem do registro no canal
  const canal = await client.channels.fetch(CANAL_REGISTROS_ID);
  const msg = await canal.messages.fetch(mensagensRegistro[targetId]);

  const embed = new EmbedBuilder()
    .setTitle('<:positive:1390174067218190347> | Registro Aprovado')
    .setColor('Green')
    .addFields(
      { name: '<:c_:1389391603415650326> | Nome', value: dados.nome },
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

  // Envia a confirmação ao executor da interação
  await interaction.editReply({ content: '✅ Registro aprovado com sucesso!', components: [] });

  // Limpa dados temporários
  delete registrosTemporarios[targetId];
  delete mensagensRegistro[targetId];
}
