// Apenas os trechos novos/alterados foram incluídos abaixo para não duplicar tudo.

// Dentro de tratarInteracao: trecho "aceitar_..."
if (interaction.isButton() && interaction.customId.startsWith('aceitar_')) {
  const targetId = interaction.customId.split('_')[1];
  const dados = registrosTemporarios[targetId];
  if (!dados) {
    return interaction.reply({ content: 'Registro não encontrado.', flags: 64 });
  }

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
    content: `❓ | Deseja alterar o nome antes de aprovar o registro de <@${targetId}>?`,
    components: [row],
    flags: 64
  });
}

// Novo bloco: tratamento do select "alterar_nome_"
else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('alterar_nome_')) {
  const targetId = interaction.customId.split('_')[2];
  const escolha = interaction.values[0];

  if (escolha === 'manter') {
    const options = Object.entries(cargosPatentes).map(([nome, id]) => ({
      label: nome,
      value: id,
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`selecionar_cargo_${targetId}`)
      .setPlaceholder('Selecione a patente para aprovar o registro')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.update({
      content: 'Selecione a patente para confirmar o registro:',
      components: [row]
    });
  }

  else if (escolha === 'alterar') {
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

// Novo bloco: tratamento do modal "modal_nome_custom_"
else if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('modal_nome_custom_')) {
  const targetId = interaction.customId.split('_')[3];
  const novoNome = interaction.fields.getTextInputValue('novo_nome');
  const dados = registrosTemporarios[targetId];

  if (!dados) {
    return interaction.reply({ content: '❌ Registro não encontrado.', flags: 64 });
  }

  dados.nome = novoNome; // Atualiza o nome

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
    content: `📝 | Nome alterado com sucesso para: **${novoNome}**.\nAgora selecione a patente para continuar:`,
    components: [row],
    flags: 64
  });
}
