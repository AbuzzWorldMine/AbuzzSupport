const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
} = require('discord.js');
const { loadConfig, saveConfig } = require('./configStore');

function registerTicketHandlers(client) {
  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isButton() && interaction.customId === 'create_ticket') {
        await handleOpenModal(interaction);
      } else if (interaction.isModalSubmit() && interaction.customId === 'ticket_modal') {
        await handleModalSubmit(interaction);
      } else if (interaction.isButton() && interaction.customId === 'close_ticket') {
        await handleCloseTicket(interaction);
      }
    } catch (err) {
      console.error('Ошибка обработки interaction:', err);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        interaction.reply({ content: 'Произошла ошибка. Попробуйте позже.', ephemeral: true }).catch(() => {});
      }
    }
  });
}

async function handleOpenModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('ticket_modal')
    .setTitle('Создание тикета поддержки');

  const subjectInput = new TextInputBuilder()
    .setCustomId('ticket_subject')
    .setLabel('Тема обращения')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const descriptionInput = new TextInputBuilder()
    .setCustomId('ticket_description')
    .setLabel('Опишите проблему')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  modal.addComponents(
    new ActionRowBuilder().addComponents(subjectInput),
    new ActionRowBuilder().addComponents(descriptionInput)
  );

  await interaction.showModal(modal);
}

async function handleModalSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const config = loadConfig();
  const guild = interaction.guild;

  if (!config.ticketCategoryId) {
    return interaction.editReply('Категория для тикетов не настроена. Обратитесь к администратору.');
  }

  const subject = interaction.fields.getTextInputValue('ticket_subject');
  const description = interaction.fields.getTextInputValue('ticket_description');

  config.ticketCounter = (config.ticketCounter || 0) + 1;
  const ticketNumber = String(config.ticketCounter).padStart(4, '0');
  saveConfig(config);

  const channelName = (config.ticketNameFormat || 'ticket-{number}')
    .replace('{number}', ticketNumber)
    .replace('{user}', interaction.user.username)
    .toLowerCase()
    .replace(/[^a-z0-9а-яё-]/gi, '-')
    .slice(0, 90);

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel],
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
      ],
    },
    {
      id: interaction.client.user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ManageChannels,
      ],
    },
  ];

  const supportRoleIds = Array.isArray(config.supportRoleIds) ? config.supportRoleIds : [];
  for (const roleId of supportRoleIds) {
    if (!roleId) continue;
    overwrites.push({
      id: roleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
    });
  }

  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: config.ticketCategoryId,
    permissionOverwrites: overwrites,
    topic: `Тикет от ${interaction.user.tag} | ${subject}`,
  });

  const embed = new EmbedBuilder()
    .setTitle(`Тикет #${ticketNumber} — ${subject}`)
    .setDescription(description)
    .addFields({ name: 'Автор', value: `<@${interaction.user.id}>` })
    .setColor(config.embed?.color || '#5865F2')
    .setTimestamp();

  const closeButton = new ButtonBuilder()
    .setCustomId('close_ticket')
    .setLabel('Закрыть тикет')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🔒');

  const row = new ActionRowBuilder().addComponents(closeButton);

  const welcome = (config.welcomeMessage || '').replace('{user}', `<@${interaction.user.id}>`);
  const roleMentions = supportRoleIds.map((id) => `<@&${id}>`).join(' ');

  await ticketChannel.send({
    content: `<@${interaction.user.id}>${roleMentions ? ` ${roleMentions}` : ''}\n${welcome}`,
    embeds: [embed],
    components: [row],
  });

  await interaction.editReply(`Тикет создан: <#${ticketChannel.id}>`);
}

async function handleCloseTicket(interaction) {
  const config = loadConfig();
  const member = interaction.member;

  if (!member) {
    return interaction.reply({ content: 'Не удалось определить ваши права на этом сервере. Попробуйте ещё раз.', ephemeral: true });
  }

  const closeRoleIds = Array.isArray(config.closeRoleIds) ? config.closeRoleIds : [];
  const supportRoleIds = Array.isArray(config.supportRoleIds) ? config.supportRoleIds : [];
  // Если роли для закрытия не заданы отдельно — используем роли поддержки
  const allowedRoleIds = closeRoleIds.length > 0 ? closeRoleIds : supportRoleIds;

  const isAllowedRole = allowedRoleIds.some((roleId) => roleId && member.roles.cache.has(roleId));
  const isAdmin = member.permissions.has(PermissionsBitField.Flags.ManageChannels);

  if (!isAllowedRole && !isAdmin) {
    return interaction.reply({
      content: '🚫 У вас нет прав закрывать этот тикет. Закрыть его может автор обращения, роль поддержки или администратор.',
      ephemeral: true,
    });
  }

  const botMember = interaction.guild.members.me;
  if (!botMember || !interaction.channel.permissionsFor(botMember).has(PermissionsBitField.Flags.ManageChannels)) {
    return interaction.reply({
      content: '⚠️ У бота нет права "Управление каналами", поэтому он не может удалить этот канал. Обратитесь к администратору сервера.',
      ephemeral: true,
    });
  }

  await interaction.reply('🔒 Тикет будет закрыт через 5 секунд...');
  setTimeout(() => {
    interaction.channel.delete().catch((err) => {
      console.error('Не удалось удалить канал тикета:', err);
      interaction.followUp({
        content: '⚠️ Не удалось закрыть тикет автоматически. Удалите канал вручную или проверьте права бота.',
        ephemeral: true,
      }).catch(() => {});
    });
  }, 5000);
}

module.exports = { registerTicketHandlers };
