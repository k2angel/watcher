const fs = require('node:fs');
const path = require('node:path');

const { version, APIVersion } = require('discord.js')
const { Client, Events, GatewayIntentBits, Partials } = require('discord.js');
const { Collection, MessageFlags, EmbedBuilder, ActivityType } = require('discord.js');

const { download, getTwitterMediaURLs, getVxtwitterUrls, updateTimestamp } = require("./utils.js");
const config = require("./config.json");
const pkg = require('./package.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.User,
        Partials.GuildMember,
        Partials.Channel,
        Partials.Message,
        Partials.Reaction
    ]
});

const attachmentsPath = path.join(__dirname, 'attachments');
if (!fs.existsSync(attachmentsPath)) fs.mkdirSync(attachmentsPath);

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    readyClient.user.setActivity('discord.js', { type: ActivityType.Playing });
    console.log('set activity > discord.js Playing...');
    console.log(`${process.platform}/${process.arch} / node@${process.version} / discord.js ${version} (API v${APIVersion})`);
    console.log(`------------- ${pkg.name} v${pkg.version} -------------`);

    if (config.profile.users.length) {
        config.profile.users.forEach(async userId => {
            const user = await readyClient.users.fetch(userId);
            console.log(`fetched user > @${user.username}(${user.id})`)
        })
    }
})

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        console.log(interaction);
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'There was an error while executing this command!',
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await interaction.reply({
                    content: 'There was an error while executing this command!',
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    });
}

client.on(Events.UserUpdate, async (oldUser, newUser) => {
    if (!config.profile.users.includes(oldUser.id)) return;

    const channelId = config.profile.sendChannel || config.adminChannel;
    const channel = client.channels.cache.get(channelId);

    if (config.profile.username && oldUser.username != newUser.username) {
        console.log(`updated username > @${oldUser.username} to @${newUser.username}`);
        const embed = new EmbedBuilder()
            .setTitle(`${oldUser.username} changes username`)
            .setDescription(
                'old\n' +
                '```\n' +
                oldUser.username +
                '\n```\n' +
                'new\n' +
                '```\n' +
                newUser.username +
                '\n```'
            )
            .setFooter({ text: `${pkg.name} v${pkg.version}`, iconURL: 'https://github.com/identicons/k2angel.png'})
            .setTimestamp();
        await channel.send({ embeds: [embed] });

        if (config.debug) console.log(embed);
        console.log(`${channel.id} @${client.user.tag}(${client.user.id}) > [EMBED]`);
    }

    if (config.profile.displayName && oldUser.displayName != newUser.displayName) {
        console.log(`updated displayName @${oldUser.username} > ${oldUser.displayName} to ${newUser.displayName}`);
        const embed = new EmbedBuilder()
            .setTitle(`${oldUser.username} changed displayName`)
            .setDescription(
                'old\n' +
                '```\n' +
                oldUser.displayName +
                '\n```\n' +
                'new\n' +
                '```\n' +
                newUser.displayName +
                '\n```'
            )
            .setFooter({ text: `${pkg.name} v${pkg.version}`, iconURL: 'https://github.com/identicons/k2angel.png'})
            .setTimestamp();
        await channel.send({ embeds: [embed] });

        if (config.debug) console.log(embed);
        console.log(`${channel.id} @${client.user.tag}(${client.user.id}) > [EMBED]`);
    }

    if (config.profile.avatar && oldUser.avatar != newUser.avatar) {
        console.log(`updated avatar @${oldUser.username}(${oldUser.id}) > ${oldUser.avatar} to ${newUser.avatar}`);
        const url = newUser.displayAvatarURL({ size: 4096});
        const embed = new EmbedBuilder()
            .setTitle(`${oldUser.username} changes avatar`)
            .setImage(url)
            .setFooter({ text: `${pkg.name} v${pkg.version}`, iconURL: 'https://github.com/identicons/k2angel.png'})
            .setTimestamp();
        await channel.send({ embeds: [embed] });

        if (config.debug) console.log(embed);
        console.log(`${channel.id} @${client.user.tag}(${client.user.id}) > [EMBED]`);

        if (newUser.avatar) {
            const urlPath = new URL(url).pathname;
            const fileName = path.basename(urlPath);
            const dest = path.join(attachmentsPath, "avatars", newUser.id, fileName);
            await download(url, dest);
        };
    }
})

client.on(Events.MessageCreate, async msg => {
    if (msg.author.bot) return;
    if (!(config.guilds.includes(msg.guild.id) || config.channels.includes(msg.channel.id))) return;

    if (config.debug) console.log(msg);
    console.log(`${msg.channel.id} @${msg.author.username}(${msg.author.id}) > ${msg.content}`);

    const dir = path.join(attachmentsPath, msg.channel.id, msg.id)
    const timestamp = msg.createdAt;
    const attachments = msg.attachments;
    attachments.forEach(async attachment => {
        const dest = path.join(dir, attachment.name);
        await download(attachment.url, dest);
        await updateTimestamp(dest, timestamp);
    })

    if (msg.messageSnapshots) {
        const snapshots = msg.messageSnapshots;
        snapshots.forEach(snapshot => {
            const attachments = snapshot.attachments;
            attachments.forEach(async attachment => {
                const dest = path.join(dir, attachment.name);
                await download(attachment.url, dest);
                await updateTimestamp(dest, timestamp);
            })
        })
    }

    if (config.twitter.enable) {
        result = getVxtwitterUrls(msg.content);
        if (!result.length) return;
        result.forEach(async vxtwitterUrl => {
            const mediaURLs = await getTwitterMediaURLs(vxtwitterUrl);
            mediaURLs.forEach(async mediaURL => {
                const url = new URL(mediaURL);
                const urlPath = url.pathname;
                const urlFormat = url.searchParams.get('format');
                const fileName = urlFormat ? `${path.basename(urlPath)}.${urlFormat}` : path.basename(urlPath);
                const dest = path.join(dir, fileName);
                await download(mediaURL, dest);
                await updateTimestamp(dest, timestamp);
            })
        })
    }
})

client.login(config.token);
