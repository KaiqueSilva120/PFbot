const { joinVoiceChannel } = require('@discordjs/voice');

async function conectarCall(client) {
  const VOICE_CHANNEL_ID = '1389411720442810379';
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) {
    console.error('[CALL] Guilda não encontrada');
    return;
  }

  const channel = guild.channels.cache.get(VOICE_CHANNEL_ID);
  if (!channel || channel.type !== 2) {
    console.error('[CALL] Canal de voz não encontrado ou inválido');
    return;
  }

  const connection = joinVoiceChannel({
    channelId: VOICE_CHANNEL_ID,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
  });

  console.log(`[CALL] Conectado no canal de voz: ${channel.name}`);

  return connection;
}

module.exports = { conectarCall };
