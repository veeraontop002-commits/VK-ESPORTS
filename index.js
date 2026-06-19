require('dotenv').config();
const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType
} = require('@discordjs/voice');

const path = require('path');
const http = require('http');
const fs = require('fs');

require('opusscript');
require('libsodium-wrappers');

// Health check
const PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('10 Bots - Premium Authorized Spammer & Audio Fleet');
}).listen(PORT);

const OWNER_ID = process.env.OWNER_ID || "1434471542187884565";
const CONTRO_ROLE_ID = "1507748485309403378";
const authorizedFilePath = path.join(__dirname, 'authorized.json');
let authorizedUsers = new Set();

function loadAuthorizedUsers() {
  try {
    if (fs.existsSync(authorizedFilePath)) {
      const data = fs.readFileSync(authorizedFilePath, 'utf8');
      const list = JSON.parse(data);
      authorizedUsers = new Set(list);
      console.log(`Loaded ${authorizedUsers.size} authorized users.`);
    }
  } catch (err) {
    console.error('Error loading authorized.json:', err);
  }
}

function saveAuthorizedUsers() {
  try {
    fs.writeFileSync(authorizedFilePath, JSON.stringify(Array.from(authorizedUsers), null, 2), 'utf8');
    console.log('Saved authorized users to authorized.json');
  } catch (err) {
    console.error('Error saving authorized.json:', err);
  }
}

loadAuthorizedUsers();

const tokens = [
  process.env.TOKEN1, process.env.TOKEN2, process.env.TOKEN3, process.env.TOKEN4, process.env.TOKEN5,
  process.env.TOKEN6, process.env.TOKEN7, process.env.TOKEN8, process.env.TOKEN9, process.env.TOKEN10
].filter(t => t);

console.log(`Starting ${tokens.length} bots in PREMIUM FLEET mode...`);

const clients = [];

tokens.forEach((token, index) => {
  const botNum = index + 1;
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates
    ]
  });

  let connection;
  let player;

  const botObj = {
    client,
    botNum,
    getConnection: () => connection,
    setConnection: (conn) => { connection = conn; },
    getPlayer: () => player,
    setPlayer: (p) => { player = p; }
  };
  clients.push(botObj);

  client.on('ready', () => {
    console.log(`[Bot ${botNum}] ONLINE ✅`);
  });

  // ONLY Bot 1 handles command listening to prevent duplicated actions and response messages
  if (index === 0) {
    client.on('messageCreate', async message => {
      if (message.author.bot) return;

      const prefix = '!';
      if (!message.content.startsWith(prefix)) return;

      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const command = args.shift().toLowerCase();

      const userId = message.author.id;
      const isOwner = userId === OWNER_ID;
      
      // Check if user has the 'contro' role (ID: 1507748485309403378)
      const member = message.member || (message.guild ? await message.guild.members.fetch(userId).catch(() => null) : null);
      const hasControRole = member ? member.roles.cache.has(CONTRO_ROLE_ID) : false;

      const authorized = isOwner || hasControRole || authorizedUsers.has(userId);

      // Silently ignore if not authorized
      if (!authorized) return;

      // 🛡️ OWNER-ONLY COMMANDS
      if (command === 'auth') {
        if (!isOwner) return message.reply('❌ Only the fleet owner can authorize users!');
        const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
        if (!target) return message.reply('❌ Usage: `!auth @user` or `!auth <userID>`');
        
        authorizedUsers.add(target.id);
        saveAuthorizedUsers();
        return message.reply(`✅ **${target.tag}** (${target.id}) has been authorized!`);
      }

      if (command === 'unauth') {
        if (!isOwner) return message.reply('❌ Only the fleet owner can unauthorize users!');
        const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
        if (!target) return message.reply('❌ Usage: `!unauth @user` or `!unauth <userID>`');
        
        if (target.id === OWNER_ID) return message.reply('❌ You cannot unauthorize the owner!');
        
        if (authorizedUsers.delete(target.id)) {
          saveAuthorizedUsers();
          return message.reply(`✅ **${target.tag}** (${target.id}) has been unauthorized.`);
        } else {
          return message.reply(`❌ User is not authorized.`);
        }
      }

      if (command === 'authlist') {
        const list = Array.from(authorizedUsers).map(id => `<@${id}> (${id})`).join('\n') || '*No authorized users.*';
        const embed = new EmbedBuilder()
          .setTitle('🛡️ Authorized Fleet Commanders')
          .setDescription(`**Owner:** <@${OWNER_ID}>\n\n**Authorized Users:**\n${list}`)
          .setColor(0x00ae86)
          .setTimestamp();
        return message.reply({ embeds: [embed] });
      }

      // ⚡ INTERACTIVE CONTROL PANEL
      if (command === 'panel') {
        const embed = new EmbedBuilder()
          .setTitle('⚡ KAC 10-BOT FLEET COMMAND PANEL ⚡')
          .setDescription('Interactive control console for audio operations and spam systems.')
          .addFields(
            { name: '🟢 Status', value: `\`${clients.length} Bots Online\``, inline: true },
            { name: '🛡️ Owner', value: `<@${OWNER_ID}>`, inline: true },
            { name: '📢 SPAM Trigger', value: 'Use `!spam <target> [count]` or click the spam button below!', inline: false }
          )
          .setColor(0xff0055)
          .setThumbnail(client.user.displayAvatarURL())
          .setTimestamp();

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('fleet_join').setLabel('Join VC').setStyle(ButtonStyle.Primary).setEmoji('🚀'),
          new ButtonBuilder().setCustomId('fleet_earrape').setLabel('Pure Earrape').setStyle(ButtonStyle.Danger).setEmoji('🔊'),
          new ButtonBuilder().setCustomId('fleet_stop').setLabel('Stop Audio').setStyle(ButtonStyle.Secondary).setEmoji('⏹️'),
          new ButtonBuilder().setCustomId('fleet_leave').setLabel('Leave VC').setStyle(ButtonStyle.Danger).setEmoji('🚪'),
          new ButtonBuilder().setCustomId('fleet_spam_btn').setLabel('Spam Target').setStyle(ButtonStyle.Success).setEmoji('🔥')
        );

        return message.reply({ embeds: [embed], components: [row1] });
      }

      // 🚀 FLEET AUDIO & VOICE CONTROL COMMANDS
      if (command === 'vkvc' || command === 'joinall') {
        const vc = message.member?.voice?.channel;
        if (!vc) return message.reply('❌ You must be in a voice channel first!');
        message.reply(`🚀 Fleet joining voice channel **${vc.name}**...`);
        joinAllVoice(vc, message.guild.id);
      }

      if (command === 'vklv' || command === 'leaveall') {
        message.reply('🚪 Fleet leaving all voice channels...');
        leaveAllVoice();
      }

      if (command === 'vkst' || command === 'stall' || command === 'earrape') {
        message.reply('🔊🌋 Playing NUCLEAR STACKED EARRAPE across all bots...');
        playAllEarrape();
      }

      if (command === 'vksp' || command === 'stopall') {
        message.reply('⏹️ Stopping audio playbacks...');
        stopAllAudio();
      }

      // 🔥 SPAM COMMANDS
      if (command === 'spam') {
        const target = args[0];
        if (!target) return message.reply('❌ Usage: `!spam <@user or userId> [count]`');
        const count = args[1] || 5;
        message.reply(`🔥 Initiating multi-bot spam targeting ${target} (Count: ${count})...`);
        executeSpam(target, count, message.channel);
      }

      if (command === 'dmspam') {
        const target = args[0];
        if (!target) return message.reply('❌ Usage: `!dmspam <userId or @user> [count]`');
        const count = args[1] || 5;
        message.reply(`💬 Initiating direct message spam targeting ${target} (Count: ${count})...`);
        executeDmSpam(target, count);
      }

      if (command === 'say') {
        const targetChannel = message.mentions.channels.first() || (args[0] ? await client.channels.fetch(args[0]).catch(() => null) : null);
        if (!targetChannel) return message.reply('❌ Usage: `!say <#channel or channelID> <message...>`');
        const content = args.slice(1).join(' ');
        if (!content) return message.reply('❌ Please specify a message to send.');
        
        await targetChannel.send(content);
        if (message.deletable) await message.delete().catch(() => null);
      }
    });

    // 🎛️ INTERACTION LISTENER (BUTTONS & MODALS)
    client.on('interactionCreate', async interaction => {
      const userId = interaction.user.id;
      const isOwner = userId === OWNER_ID;
      
      // Check if user has the 'contro' role (ID: 1507748485309403378)
      const member = interaction.member || (interaction.guild ? await interaction.guild.members.fetch(userId).catch(() => null) : null);
      const hasControRole = member ? member.roles.cache.has(CONTRO_ROLE_ID) : false;

      const authorized = isOwner || hasControRole || authorizedUsers.has(userId);

      if (!authorized) {
        return interaction.reply({ content: '❌ You are not authorized to control the fleet!', ephemeral: true });
      }

      if (interaction.isButton()) {
        if (interaction.customId === 'fleet_join') {
          const member = await interaction.guild.members.fetch(userId).catch(() => null);
          const vc = member?.voice?.channel;
          if (!vc) return interaction.reply({ content: '❌ You must be in a voice channel first!', ephemeral: true });
          
          await interaction.reply({ content: `🚀 Fleet is joining **${vc.name}**...`, ephemeral: true });
          joinAllVoice(vc, interaction.guild.id);
        }

        if (interaction.customId === 'fleet_earrape') {
          await interaction.reply({ content: '🔊🌋 Playing NUCLEAR STACKED EARRAPE...', ephemeral: true });
          playAllEarrape();
        }

        if (interaction.customId === 'fleet_stop') {
          await interaction.reply({ content: '⏹️ Stopping audio playbacks...', ephemeral: true });
          stopAllAudio();
        }

        if (interaction.customId === 'fleet_leave') {
          await interaction.reply({ content: '🚪 Fleet is leaving voice channels...', ephemeral: true });
          leaveAllVoice();
        }

        if (interaction.customId === 'fleet_spam_btn') {
          const modal = new ModalBuilder()
            .setCustomId('spam_modal')
            .setTitle('Fleet Spam Operation');

          const targetInput = new TextInputBuilder()
            .setCustomId('spam_target')
            .setLabel('Target ID or @Mention')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter User ID or Mention')
            .setRequired(true);

          const countInput = new TextInputBuilder()
            .setCustomId('spam_count')
            .setLabel('Spam Count (Max 50)')
            .setStyle(TextInputStyle.Short)
            .setValue('5')
            .setRequired(true);

          const firstActionRow = new ActionRowBuilder().addComponents(targetInput);
          const secondActionRow = new ActionRowBuilder().addComponents(countInput);

          modal.addComponents(firstActionRow, secondActionRow);
          await interaction.showModal(modal);
        }
      }

      if (interaction.isModalSubmit()) {
        if (interaction.customId === 'spam_modal') {
          const target = interaction.fields.getTextInputValue('spam_target');
          const count = interaction.fields.getTextInputValue('spam_count');
          
          await interaction.reply({ content: `🔥 Initiating multi-bot spam targeting ${target} (Count: ${count})...`, ephemeral: true });
          executeSpam(target, count, interaction.channel);
        }
      }
    });
  }

  client.login(token).catch(err => console.error(`[Bot ${botNum}] LOGIN FAILED`));
});

// 🛠️ FLEET HELPER FUNCTIONS

async function joinAllVoice(vc, guildId) {
  console.log(`🚀 Fleet starting voice channel join to ${vc.name}...`);
  
  clients.forEach((bot, index) => {
    // Stagger connections (no delay needed with new approach)
    setTimeout(async () => {
      attemptVoiceJoin(bot, vc, guildId, 0);
    }, index * 500);
  });
}

// Simplified voice join with aggressive retry
async function attemptVoiceJoin(bot, vc, guildId, retryCount = 0) {
  const maxRetries = 2;
  
  try {
    let guild = bot.client.guilds.cache.get(guildId);
    if (!guild) {
      guild = await bot.client.guilds.fetch(guildId).catch(() => null);
    }
    if (!guild) {
      console.error(`[Bot ${bot.botNum}] Guild not found`);
      return;
    }

    const voiceAdapterCreator = guild.voiceAdapterCreator;
    if (!voiceAdapterCreator) {
      console.error(`[Bot ${bot.botNum}] Voice adapter not available`);
      return;
    }

    // Destroy any existing connection first
    let oldConn = bot.getConnection();
    if (oldConn) {
      try {
        oldConn.destroy();
      } catch (e) {}
      bot.setConnection(null);
    }

    // Create fresh connection
    const conn = joinVoiceChannel({
      channelId: vc.id,
      guildId: guildId,
      adapterCreator: voiceAdapterCreator,
      selfDeaf: true,
      group: bot.client.user.id
    });

    // Store immediately - don't wait for ready
    bot.setConnection(conn);
    console.log(`[Bot ${bot.botNum}] ➡️ Joining ${vc.name}...`);

    let hasErrored = false;
    let readyTimeout = null;

    conn.on('error', (err) => {
      if (!hasErrored) {
        hasErrored = true;
        console.error(`[Bot ${bot.botNum}] Voice Error: ${err.message}`);
        
        if (readyTimeout) clearTimeout(readyTimeout);
        
        // Retry on error
        if (retryCount < maxRetries) {
          console.log(`[Bot ${bot.botNum}] 🔄 Retrying... (${retryCount + 1}/${maxRetries})`);
          setTimeout(() => {
            attemptVoiceJoin(bot, vc, guildId, retryCount + 1);
          }, 1000);
        }
      }
    });

    conn.on('stateChange', (oldState, newState) => {
      if (newState.status === VoiceConnectionStatus.Ready) {
        if (readyTimeout) clearTimeout(readyTimeout);
        console.log(`[Bot ${bot.botNum}] ✅ READY`);
      } else {
        console.log(`[Bot ${bot.botNum}] ${newState.status}`);
      }
    });

  } catch (err) {
    console.error(`[Bot ${bot.botNum}] Join Error: ${err.message}`);
    if (retryCount < maxRetries) {
      setTimeout(() => {
        attemptVoiceJoin(bot, vc, guildId, retryCount + 1);
      }, 1000);
    }
  }
}

function leaveAllVoice() {
  console.log('🚪 Fleet leaving all voice channels...');
  let leftCount = 0;
  
  clients.forEach(bot => {
    try {
      const conn = bot.getConnection();
      if (conn) {
        conn.destroy();
        bot.setConnection(null);
        leftCount++;
      }
    } catch (err) {
      console.error(`[Bot ${bot.botNum}] Leave error: ${err.message}`);
    }
  });
  
  console.log(`✅ ${leftCount} bots left voice channels`);
}

function playAllEarrape() {
  const audioPath = path.join(__dirname, 'mega_loud.mp3');
  if (!fs.existsSync(audioPath)) {
    console.error('❌ Audio file not found:', audioPath);
    return;
  }

  console.log('� Playing audio on all bots NOW...');
  let playCount = 0;

  // Play on all bots that have connections immediately
  clients.forEach((bot, index) => {
    setTimeout(() => {
      const conn = bot.getConnection();
      
      if (!conn || conn.state.status === VoiceConnectionStatus.Destroyed) {
        console.warn(`[Bot ${bot.botNum}] No connection available`);
        return;
      }

      // Play regardless of state - discord.js will handle it
      playAudioOnBot(bot, audioPath);
      playCount++;
    }, index * 100);
  });

  console.log(`🎵 Audio playback initiated on ${playCount} bots`);
}

// Ultra-simple audio playback
function playAudioOnBot(bot, audioPath) {
  try {
    const conn = bot.getConnection();
    if (!conn) {
      console.warn(`[Bot ${bot.botNum}] Connection lost`);
      return;
    }

    // Stop old player
    const oldPlayer = bot.getPlayer();
    if (oldPlayer) {
      try {
        oldPlayer.stop();
      } catch (e) {}
    }

    // Create resource
    const resource = createAudioResource(audioPath, {
      inlineVolume: true,
      inputType: StreamType.Arbitrary
    });

    if (resource.volume) {
      resource.volume.setVolume(5.0);
    }

    // Create player
    const player = createAudioPlayer();

    player.on('error', (err) => {
      console.error(`[Bot ${bot.botNum}] Player error: ${err.message}`);
    });

    player.on('stateChange', (oldState, newState) => {
      if (newState.status === AudioPlayerStatus.Playing) {
        console.log(`[Bot ${bot.botNum}] 🔊 PLAYING EARRAPE 🌋☢️`);
      }
    });

    // Subscribe and play
    conn.subscribe(player);
    player.play(resource);
    bot.setPlayer(player);
    
  } catch (err) {
    console.error(`[Bot ${bot.botNum}] Play error: ${err.message}`);
  }
}

function stopAllAudio() {
  console.log('⏹️ Stopping all audio playback...');
  let stoppedCount = 0;
  
  clients.forEach(bot => {
    try {
      const player = bot.getPlayer();
      if (player) {
        player.stop();
        bot.setPlayer(null);
        stoppedCount++;
      }
    } catch (err) {
      console.error(`[Bot ${bot.botNum}] Stop error: ${err.message}`);
    }
  });
  
  console.log(`✅ Stopped audio on ${stoppedCount} bots`);
}

async function executeSpam(targetMentionOrId, countVal, channel) {
  const count = parseInt(countVal) || 5;
  const target = targetMentionOrId;
  const spamMessage = `*Message could not be loaded*\n${target}`;

  console.log(`Executing Multi-Bot Spam against ${target} - Count: ${count}`);

  for (let i = 0; i < count; i++) {
    clients.forEach((bot, botIdx) => {
      setTimeout(async () => {
        try {
          const chan = await bot.client.channels.fetch(channel.id);
          if (chan) {
            await chan.send(spamMessage);
          }
        } catch (err) {
          console.error(`[Bot ${botIdx + 1}] Spam error:`, err.message);
        }
      }, (i * clients.length + botIdx) * 350);
    });
  }
}

async function executeDmSpam(targetUserId, countVal) {
  const count = parseInt(countVal) || 5;
  const cleanId = targetUserId.replace(/[<@!>]/g, '');

  console.log(`Executing DM Spam against User ID ${cleanId} - Count: ${count}`);

  for (let i = 0; i < count; i++) {
    clients.forEach((bot, botIdx) => {
      setTimeout(async () => {
        try {
          const user = await bot.client.users.fetch(cleanId);
          if (user) {
            await user.send(`*Message could not be loaded*`);
          }
        } catch (err) {
          console.error(`[Bot ${botIdx + 1}] DM Spam error:`, err.message);
        }
      }, (i * clients.length + botIdx) * 500);
    });
  }
}
