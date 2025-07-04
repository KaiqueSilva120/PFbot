const { EmbedBuilder } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');

function formatarDataHora(date = new Date()) {
    const pad = n => n.toString().padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

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

const MENSAGEM_PATH = path.join(__dirname, '../ultima_mensagem_lista.json');

async function listarMembrosPF(interaction) {
    await interaction.deferReply();

    const guild = interaction.guild;
    await guild.members.fetch();

    const canalLista = guild.channels.cache.get('1388941195954360432');

    const altoComandoIds = [
        "832607681796898826", "832607682249883699", "832607683349184533",
        "832607683710025740", "832607684707614720", "1389349675458629683",
        "832607687560396800"
    ];

    const membrosGeraisIds = [
        "832607688248000602", "832607688579088396", "832607689858088980",
        "832607690349215755", "832607691616419851", "832607692618596352",
        "1389079430890127454"
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
        const { membros, count } = await obterListaMembros(cargoId);
        if (count > 0) {
            textoAltoComando += `<@&${cargoId}> (${count}):\n${membros}\n\n`;
            totalAltoComando += count;
        }
    }

    let textoMembros = '', totalMembrosGerais = 0;
    for (const cargoId of membrosGeraisIds) {
        const { membros, count } = await obterListaMembros(cargoId);
        if (count > 0) {
            textoMembros += `<@&${cargoId}> (${count}):\n${membros}\n\n`;
            totalMembrosGerais += count;
        }
    }

    const embedMembros = new EmbedBuilder()
        .setTitle('📊 LISTA DE MEMBROS DA POLÍCIA FEDERAL')
        .setColor(0x00bfff)
        .setThumbnail(guild.iconURL())
        .addFields(
            { name: '<:azul:1389374322933764186> | Alto Comando', value: textoAltoComando || 'Nenhum membro do Alto Comando.' },
            { name: '<:ncrp_add:1389374322933764186> | Membros', value: textoMembros || 'Nenhum membro da PF encontrado.' },
            { name: '<:ncrp_add:1389417398880436357> | Total de Membros', value: `${totalAltoComando + totalMembrosGerais}`, inline: true },
            { name: '<:909:1389604756640759941> | Alto Comando', value: `${totalAltoComando}`, inline: true },
            { name: '\u200B', value: `Atualizado em ${formatarDataHora()} por <@${interaction.user.id}>` }
        );

    // Apagar mensagem anterior
    try {
        const dados = await fs.readFile(MENSAGEM_PATH, 'utf-8');
        const { mensagemId } = JSON.parse(dados);
        const mensagemAntiga = await canalLista.messages.fetch(mensagemId).catch(() => null);
        if (mensagemAntiga) await mensagemAntiga.delete();
    } catch {
        // Nenhuma anterior encontrada
    }

    // Enviar nova
    const novaMensagem = await canalLista.send({ embeds: [embedMembros] });

    // Salvar ID da nova
    await fs.writeFile(MENSAGEM_PATH, JSON.stringify({ mensagemId: novaMensagem.id }), 'utf-8');

    // Resposta no canal onde foi executado o comando
    await interaction.editReply(`✅ | lista de membros atualizada em <#${canalLista.id}>`);
    console.log(`[COMANDO] /membros executado por ${interaction.user.tag}`);
}

module.exports = {
    listarMembrosPF,
};
