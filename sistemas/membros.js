// sistemas/membros.js
const { EmbedBuilder } = require('discord.js');

function formatarDataHora(date = new Date()) {
    const pad = n => n.toString().padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Dados dos cargos da Polícia Federal - Mantenha esta lista atualizada e unificada!
const cargosPatentes = {
    "Diretor Geral": "832607681796898826",
    "Diretor": "832607682249883699",
    "Delegado Geral": "832607683349184533", // Se o nome do cargo é "Delegado Geral"
    "Delegado": "832607683710025740",     // Se o nome do cargo é "Delegado"
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

// Esta função agora será chamada pelo comandos.js
async function listarMembrosPF(interaction) {
    await interaction.deferReply(); // Deferir a resposta imediatamente

    const guild = interaction.guild;
    await guild.members.fetch(); // Garante que o cache de membros está atualizado

    // IDs dos cargos de Alto Comando
    const altoComandoIds = [
      "832607681796898826", // Diretor Geral
      "832607682249883699", // Diretor
      "832607683349184533", // Delegado Geral
      "832607683710025740", // Delegado
      "832607684707614720", // Superintendente
      "1389349675458629683", // Inspetor Chefe
      "832607687560396800"  // Inspetor
    ];

    // IDs dos cargos de Membros Gerais
    const membrosGeraisIds = [
      "832607688248000602", // Investigador Chefe
      "832607688579088396", // Investigador
      "832607689858088980", // Escrivão
      "832607690349215755", // Perito
      "832607691616419851", // Agente Especial
      "832607692618596352", // Agente
      "1389079430890127454" // Aluno
    ];

    async function obterListaMembros(cargoId) {
        const role = guild.roles.cache.get(cargoId);
        if (!role) return { nome: 'Cargo não encontrado', membros: 'Nenhum membro', count: 0 };
        
        const membros = role.members;
        const lista = membros.size > 0 ? Array.from(membros.values()).map(m => `• <@${m.id}>`).join('\n') : 'Nenhum membro';
        return { nome: role.name, membros: lista, count: membros.size };
    }

    let textoAltoComando = '', totalAltoComando = 0;
    for (const cargoId of altoComandoIds) {
        const { nome, membros, count } = await obterListaMembros(cargoId);
        if (count > 0) {
            textoAltoComando += `<@&${cargoId}> (${count}):\n${membros}\n\n`;
            totalAltoComando += count;
        }
    }

    let textoMembros = '', totalMembrosGerais = 0;
    for (const cargoId of membrosGeraisIds) {
        const { nome, membros, count } = await obterListaMembros(cargoId);
        if (count > 0) {
            textoMembros += `<@&${cargoId}> (${count}):\n${membros}\n\n`;
            totalMembrosGerais += count;
        }
    }

    const iconURL = guild.iconURL();

    const embedMembros = new EmbedBuilder()
        .setTitle('📊 LISTA DE MEMBROS DA POLÍCIA FEDERAL')
        .setColor(0x00bfff)
        .setThumbnail(iconURL)
        .addFields(
            { name: '<:azul:1389374322933764186> | Alto Comando', value: textoAltoComando || 'Nenhum membro do Alto Comando.' },
            { name: '<:ncrp_add:1389374322933764186> | Membros', value: textoMembros || 'Nenhum membro da PF encontrado.' },
        )
        .setFooter({ text: `Total de Membros: ${totalMembrosGerais + totalAltoComando} | Atualizado em ${formatarDataHora()}` });

    await interaction.editReply({ embeds: [embedMembros] });
    console.log(`[COMANDO] /membros executado por ${interaction.user.tag}`);
}

module.exports = {
    listarMembrosPF, // Exporta a função para ser usada por comandos.js
};