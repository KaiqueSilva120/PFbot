// sistemas/comandos.js
const { REST, Routes } = require('discord.js');
const { listarMembrosPF } = require('./membros'); 
const { comandoEmbed, executar: executarEmbed, tratarEmbed } = require('./embed');

module.exports = {
  registrarComandos: async (client, TOKEN, CLIENT_ID, GUILD_ID) => { 
    const rest = new REST({ version: '10' }).setToken(TOKEN);

    const comandosParaRegistrar = [
      { name: 'ping', description: 'Responde com Pong!' },
      { name: 'membros', description: 'Listar membros da Polícia Federal.' },
      comandoEmbed.toJSON()
    ];

    try {
      console.log(`[REGISTRO COMANDOS] Iniciando...`);

      // (Opcional) Limpa comandos GLOBAIS só uma vez
      console.log(`[REGISTRO COMANDOS] Limpando comandos globais...`);
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: [] }
      );
      console.log(`[REGISTRO COMANDOS] Comandos globais apagados.`);

      // Limpa comandos da GUILD (servidor)
      console.log(`[REGISTRO COMANDOS] Limpando comandos do servidor ${GUILD_ID}...`);
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: [] }
      );
      console.log(`[REGISTRO COMANDOS] Comandos do servidor limpos.`);

      // Registra SOMENTE no servidor
      console.log(`[REGISTRO COMANDOS] Registrando comandos no servidor...`);
      const data = await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: comandosParaRegistrar }
      );
      console.log(`[REGISTRO COMANDOS] Comandos registrados com sucesso:`, data.map(c => c.name));
      
    } catch (error) {
      console.error('[ERRO REGISTRO COMANDOS]', error);
      if (error.rawError?.message) {
        console.error('[DETALHES DA API]', error.rawError.message);
      }
    }
  },

  executarComando: async (interaction, client, CARGO_EQUIPE_GESTORA, CANAL_MENSAGENS_MEMBROS) => {
    const { commandName } = interaction;

    if (commandName === 'ping') {
      await interaction.reply('Pong!');
      console.log(`[COMANDO] /ping executado por ${interaction.user.tag}`);
      return true;
    }

    else if (commandName === 'membros') {
      await listarMembrosPF(interaction);
      return true;
    }

    else if (commandName === 'embed') {
      await executarEmbed(interaction, client);
      return true;
    }

    return false;
  },

  tratarModal: async (interaction, client) => {
    if (interaction.customId === 'criar_embed') {
      await tratarEmbed(interaction, client);
      return true;
    }
    return false;
  }
};
