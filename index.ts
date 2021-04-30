/* eslint-disable no-console */
import 'source-map-support/register';
import * as Discord from 'discord.js';
// https://discord.js.org/#/docs/main/stable/general/welcome
import * as fs from 'fs';

import Markov, {
  MarkovGenerateOptions,
  MarkovResult,
  MarkovConstructorOptions,
  MarkovImportExport,
} from 'markov-strings';

import * as schedule from 'node-schedule';

interface MessageRecord {
  id: string;
  string: string;
  attachment?: string;
}

interface MarkbotMarkovResult extends MarkovResult {
  refs: Array<MessageRecord>;
}

interface MessagesDB {
  messages: MessageRecord[];
}

interface MarkbotConfig {
  stateSize?: number;
  minScore?: number;
  maxTries?: number;
  prefix?: string;
  game?: string;
  token?: string;
}

const version: string = JSON.parse(fs.readFileSync('./package.json', 'utf8')).version || '0.0.0';

const client = new Discord.Client();
// const ZEROWIDTH_SPACE = String.fromCharCode(parseInt('200B', 16));
// const MAXMESSAGELENGTH = 2000;

const PAGE_SIZE = 100;
// let guilds = [];
// let connected = -1;
let GAME = '!tingz help';
let PREFIX = '!tingz';
let STATE_SIZE = 2; // Value of 1 to 3, based on corpus quality
let MAX_TRIES = 1000;
let MIN_SCORE = 10;
const inviteCmd = 'invite';
const errors: string[] = [];
const reaccs: string[] = ['823637888079102002', '703412391014039572',
  '825100412750135336', '823831591808925717', '703611122405867560',
  '823829868868927488', '823828295220461618'];

const pleb_reaccs: Record<string, string> = {};
pleb_reaccs.vibecatfast = '823831566844166214';
pleb_reaccs.wtfcat = '823831591808925717';
pleb_reaccs.wsb = '823646592737214464';
pleb_reaccs.vibecat = '823637094676430878';
pleb_reaccs.stonkz = '825100412750135336';
pleb_reaccs.imokimokimok = '823634839877713991';
pleb_reaccs.rollsafe = '823832624355082250';
pleb_reaccs.petnick = '823824416357744641';
pleb_reaccs.petmilan = '823825024326041620';
pleb_reaccs.petmike = '823825648355115058';
pleb_reaccs.petkarz = '823826801180672021';
pleb_reaccs.petevanpain = '823963527441940560';
pleb_reaccs.petaustin = '824353304041357374';
pleb_reaccs.petamer = '823826087946747915';
pleb_reaccs.patpat = '823823793020993547';
pleb_reaccs.hehehe = '823831646142201906';
pleb_reaccs.dogdance = '823828685332545557';
pleb_reaccs.arabdance = '823828140920406086';
pleb_reaccs.petkam = '834471334632751157'

let shitpost: string = 'Mr. Amer, Mr. Vice Milan, Members of Tingzgress, Tom the First Lady of the Tingz, and Citizens of Tingz: Tonight, as we mark the conclusion of our celebration of Black History Month, we are reminded of our Nation\'s path toward civil rights and the work that still remains. Recent threats targeting Jewish Community Centers and vandalism of Jewish cemeteries, as well as last week\'s shooting in Kansas City, remind us that while we may be a Nation divided on policies, we are a country that stands united in condemning hate and evil in all its forms. Each Tingz generation passes the torch of truth, liberty and justice --- in an unbroken chain all the way down to the present. That torch is now in our hands. And we will use it to light up the world. I am here tonight to deliver a message of unity and strength, and it is a message deeply delivered from my heart. A new chapter of Tingz Greatness is now beginning. A new national pride is sweeping across our Nation. And a new surge of optimism is placing impossible dreams firmly within our grasp. What we are witnessing today is the Renewal of the Tingz Spirit. Our allies will find that Tingz is once again ready to lead. All the nations of the world -- friend or foe -- will find that Tingz is strong, Tingz is proud, and Tingz is free. In 9 years, the Tingz will celebrate the 250th anniversary of our founding -- 250 years since the day we declared our Independence. It will be one of the great milestones in the history of the world. But what will Tingz look like as we reach our 250th year? What kind of country will we leave for our children? I will not allow the mistakes of recent decades past to define the course of our future.'

let shitpost2: string = 'It was going to be another long, boring evening at the engsoc office, Milan thought to himself as he finished up another report. As was often the case, he was one of the last ones there for the day, along with Patrick and Colin. And they were the only really good things about his job, he reflected. Especially Patrick. He saw Patrick brush a few stray wisps of hair from his face in a habitual gesture, then get up from his chair and head over to where Colin sat. He tapped on Milan\'s desk as he passed, giving him a wink and a smile. Milan looked up at him, then darted a glance at Colin before rolling his eyes: he hadn\'t had any more luck getting his attention than Colin. Both men knew that women found them attractive: Milan had smoky brown eyes and a figure that was the definition of voluptuous; Patrick was a dark brunette with a more petite, athletic build and a face most women simply couldn\'t look away from.  Patrick tended to wear revealing, tight-fitting clothes, but was smart enough not to wear them too tight: he wanted to show off his figure, not look like she had squeezed himself into a sausage roll. No, the most captivating thing about him wasn\'t his body, it was what was inside. He was actually an incredibly nice guy who had figured out how to be a man without being a jerk. And for some reason Milan couldn\'t put his finger on, he found him really sexy. They had been working hard together all semester at putting together a report to fire Jose Parera. \"Here\'s this one, Milan,\" Patrick said as he sidled up next to him, handing him the report with one hand, while resting the other on the back of his chair. Milan had to give Patrick credit for subtle moves: he noticed that two of his fingers on the hand resting on his chair were brushing against his back, just enough that he would be sure to feel the contact. In a less subtle move, his cock hung right in front of him as he leaned over to put the report on his desk. Milan looked up from the project he was working on, looking Patrick in the eye and giving him a smile without even glancing at his cock. One month later Jose Parera was fired.'

let fileObj: MessagesDB = {
  messages: [],
};

let markovDB: MessageRecord[] = [];
let messageCache: MessageRecord[] = [];
let deletionCache: string[] = [];
let markovOpts: MarkovConstructorOptions = {
  stateSize: STATE_SIZE,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function uniqueBy<Record extends { [key: string]: any }>(
  arr: Record[],
  propertyName: keyof Record
): Record[] {
  const unique: Record[] = [];
  const found: { [key: string]: boolean } = {};

  for (let i = 0; i < arr.length; i += 1) {
    if (arr[i][propertyName]) {
      const value = arr[i][propertyName];
      if (!found[value]) {
        found[value] = true;
        unique.push(arr[i]);
      }
    }
  }
  return unique;
}

/**
 * Regenerates the corpus and saves all cached changes to disk
 */
function regenMarkov(): void {
  console.log('Regenerating Markov corpus...');
  try {
    fileObj = JSON.parse(fs.readFileSync('config/markovDB.json', 'utf8'));
  } catch (err) {
    console.log('No markovDB.json, starting with initial values');
    fileObj = {
      messages: [
        {
          id: '0',
          string: '',
        },
      ],
    };
  }
  // console.log("MessageCache", messageCache)
  markovDB = fileObj.messages;
  markovDB = uniqueBy<MessageRecord>(markovDB.concat(messageCache), 'id');
  deletionCache.forEach(id => {
    const removeIndex = markovDB.map(item => item.id).indexOf(id);
    // console.log('Remove Index:', removeIndex)
    markovDB.splice(removeIndex, 1);
  });
  deletionCache = [];
  const markov = new Markov(markovOpts);
  fileObj.messages = markovDB;
  // console.log("WRITING THE FOLLOWING DATA:")
  // console.log(fileObj)
  fs.writeFileSync('config/markovDB.json', JSON.stringify(fileObj), {encoding: 'utf-8', flag: 'w'});
  fileObj.messages = [];
  messageCache = [];
  markov.addData(markovDB);
  fs.writeFileSync('config/markov.json', JSON.stringify(markov.export()));
  console.log('Done regenerating Markov corpus.');
}

/**
 * Loads the config settings from disk
 */
function loadConfig(): void {
  // Move config if in legacy location
  if (fs.existsSync('./config.json')) {
    console.log('Copying config.json to new location in ./config');
    fs.renameSync('./config.json', './config/config.json');
  }

  if (fs.existsSync('./markovDB.json')) {
    console.log('Copying markovDB.json to new location in ./config');
    fs.renameSync('./markovDB.json', './config/markovDB.json');
  }

  let token = 'missing';
  try {
    const cfg: MarkbotConfig = JSON.parse(fs.readFileSync('./config/config.json', 'utf8'));
    PREFIX = cfg.prefix || '!tingz';
    GAME = cfg.game || '!tingz help';
    token = cfg.token || process.env.TOKEN || token;
    STATE_SIZE = cfg.stateSize || STATE_SIZE;
    MIN_SCORE = cfg.minScore || MIN_SCORE;
    MAX_TRIES = cfg.maxTries || MAX_TRIES;
  } catch (e) {
    console.warn('Failed to read config.json.');
    token = process.env.TOKEN || token;
  }
  try {
    client.login(token);
  } catch (e) {
    console.error('Failed to login with token:', token);
  }
  markovOpts = {
    stateSize: STATE_SIZE,
  };
}

/**
 * Checks if the author of a message as moderator-like permissions.
 * @param {GuildMember} member Sender of the message
 * @return {Boolean} True if the sender is a moderator.
 */
function isModerator(member: Discord.GuildMember): boolean {
  return (
    member.hasPermission('ADMINISTRATOR') ||
    member.hasPermission('MANAGE_CHANNELS') ||
    member.hasPermission('KICK_MEMBERS') ||
    member.hasPermission('MOVE_MEMBERS')
  );
}

/**
 * Reads a new message and checks if and which command it is.
 * @param {Message} message Message to be interpreted as a command
 * @return {String} Command string
 */
function validateMessage(message: Discord.Message): string | null {
  const messageText = message.content.toLowerCase();
  let command = null;
  const thisPrefix = messageText.substring(0, PREFIX.length);
  if (thisPrefix === PREFIX) {
    const split = messageText.split(' ');
    console.log(split[1]);
    if (split[0] === PREFIX && split.length === 1) {
      command = 'respond';
    } else if (split[1] === 'train') {
      command = 'train';
    } else if (split[1] === 'help') {
      command = 'help';
    } else if (split[1] === 'regen') {
      command = 'regen';
    } else if (split[1] === 'invite') {
      command = 'invite';
    } else if (split[1] === 'debug') {
      command = 'debug';
    } else if (split[1] === 'tts') {
      command = 'tts';
    } else if (split[1] === 'prompt') {
      command = 'prompt';
    } else if (split[1] === 'reacc') {
      command = 'reacc';
    }
  }
  return command;
}

function getPrompt(message: Discord.Message): string | null {
  const messageText = message.content.toLowerCase();
  return messageText.substring(messageText.indexOf('prompt')+6).trim();
}

function getReacc(message: Discord.Message): string {
  const messageText = message.content.toLowerCase();
  const split = messageText.split(' ');
  if (split[2] !== undefined) {
    return split[2];
  }
  return '';
}

/**
 * Function to recursively get all messages in a text channel's history. Ends
 * by regnerating the corpus.
 * @param {Message} message Message initiating the command, used for getting
 * channel data
 */
async function fetchMessages(message: Discord.Message): Promise<void> {
  let historyCache: MessageRecord[] = [];
  let keepGoing = true;
  let oldestMessageID: string | undefined;

  while (keepGoing) {
    const messages: Discord.Collection<
      string,
      Discord.Message
      // eslint-disable-next-line no-await-in-loop
    > = await message.channel.messages.fetch({
      before: oldestMessageID,
      limit: PAGE_SIZE,
    });
    const nonBotMessageFormatted = messages
      .filter(elem => !elem.author.bot)
      .filter(elem => elem.content.indexOf(PREFIX) === -1)
      .map(elem => {
        const dbObj: MessageRecord = {
          string: elem.content,
          id: elem.id,
        };
        if (elem.attachments.size > 0) {
          dbObj.attachment = elem.attachments.values().next().value.url;
        }
        return dbObj;
      });
    historyCache = historyCache.concat(nonBotMessageFormatted);
    const lastMessage = messages.last();
    if (!lastMessage || messages.size < PAGE_SIZE) {
      keepGoing = false;
    } else {
      oldestMessageID = lastMessage.id;
    }
  }
  console.log(`Trained from ${historyCache.length} past human authored messages.`);
  messageCache = messageCache.concat(historyCache);
  regenMarkov();
  message.reply(`Finished training from past ${historyCache.length} messages.`);
}

function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

/**
 * General Markov-chain response function
 * @param {Message} message The message that invoked the action, used for channel info.
 * @param {Boolean} debug Sends debug info as a message if true.
 * @param {Boolean} tts If the message should be sent as TTS. Defaults to the TTS setting of the
 * invoking message.
 */
function generateResponse(message: Discord.Message, prompt = '', debug = false, tts = message.tts): void {
  console.log('Responding...');
  const options: MarkovGenerateOptions = {
    filter: (result): boolean => {
      return result.score >= MIN_SCORE;
    },
    maxTries: MAX_TRIES,
    prompt: prompt === '' ? undefined : prompt,
  };

  const fsMarkov = new Markov();
  const markovFile = JSON.parse(
    fs.readFileSync('config/markov.json', 'utf-8')
  ) as MarkovImportExport;
  fsMarkov.import(markovFile);

  try {
    const myResult = fsMarkov.generate(options) as MarkbotMarkovResult;
    console.log('Generated Result:', myResult);
    const messageOpts: Discord.MessageOptions = { tts };
    const attachmentRefs = myResult.refs
      .filter(ref => Object.prototype.hasOwnProperty.call(ref, 'attachment'))
      .map(ref => ref.attachment as string);
    if (attachmentRefs.length > 0) {
      const randomRefAttachment = attachmentRefs[Math.floor(Math.random() * attachmentRefs.length)];
      messageOpts.files = [randomRefAttachment];
    } else {
      const randomMessage = markovDB[Math.floor(Math.random() * markovDB.length)];
      if (randomMessage && randomMessage.attachment) {
        messageOpts.files = [{ attachment: randomMessage.attachment }];
      }
    }

    myResult.string = myResult.string.replace(/@everyone/g, '@everyοne'); // Replace @everyone with a homoglyph 'o'
    message.channel.send(myResult.string, messageOpts);
    if (debug) message.channel.send(`\`\`\`\n${JSON.stringify(myResult, null, 2)}\n\`\`\``);
  } catch (err) {
    console.log(err);
    if (debug) message.channel.send(`\n\`\`\`\nERROR: ${err}\n\`\`\``);
    if (err.message.includes('Cannot build sentence with current corpus')) {
      console.log('Not enough chat data for a response.');
    }
  }
}

client.on('ready', () => {
  console.log('Markbot by Charlie Laabs');
  if (client.user) client.user.setActivity(GAME);
  regenMarkov();
});

client.on('error', err => {
  const errText = `ERROR: ${err.name} - ${err.message}`;
  console.log(errText);
  errors.push(errText);
  fs.writeFile('./config/error.json', JSON.stringify(errors), fsErr => {
    if (fsErr) {
      console.log(`error writing to error file: ${fsErr.message}`);
    }
  });
});

client.on('message', message => {
  if (message.guild) {
    const command = validateMessage(message);
    if (command === 'help') {
      const avatarURL = client.user?.avatarURL() || undefined;
      const richem = new Discord.MessageEmbed()
        .setAuthor(client.user?.username, avatarURL)
        .setThumbnail(avatarURL as string)
        .setDescription('A Markov chain chatbot that speaks based on previous chat input.')
        .addField(
          '!tingz',
          'Generates a sentence to say based on the chat database. Send your ' +
            'message as TTS to recieve it as TTS.'
        )
        .addField(
          '!tingz prompt <prompt>',
          'Generates a sentence to say based on the chat database using a prompt.'
        )
        .addField(
          '!tingz reacc <reacc_name>',
          'Reaccs with the provided reacc to the message replied to.'
        )
        .addField(
          '!tingz reacc help',
          'Lists available reaccs to use.'
        )
        .addField(
          '!tingz train',
          'Fetches the maximum amount of previous messages in the current ' +
            'text channel, adds it to the database, and regenerates the corpus. Takes some time.'
        )
        .addField(
          '!tingz regen',
          'Manually regenerates the corpus to add recent chat info. Run ' +
            'this before shutting down to avoid any data loss. This automatically runs at midnight.'
        )
        .addField(
          '!tingz invite',
          "Don't invite this bot to other servers. The database is shared " +
            'between all servers and text channels.'
        )
        .addField('!tingz debug', 'Runs the !mark command and follows it up with debug info.')
        .setFooter(`Markov Discord v${version} by Katiee`);
      message.channel.send(richem).catch(() => {
        message.author.send(richem);
      });
    }
    if (command === 'train') {
      if (message.member && isModerator(message.member)) {
        console.log('Training...');
        fileObj = {
          messages: [],
        };
        fs.writeFileSync('./config/markovDB.json', JSON.stringify(fileObj), {encoding: 'utf-8', flag: 'w'});
        fetchMessages(message);
      }
    }
    if (command === 'prompt') {
      let prompt =  getPrompt(message);
      console.log('prompt ' + prompt);
      generateResponse(message, prompt ? prompt : '');
    }
    if (command === 'respond') {
      generateResponse(message);
    }
    if (command === 'tts') {
      generateResponse(message, '', false, true);
    }
    if (command === 'debug') {
      generateResponse(message, '', true);
    }
    if (command === 'regen') {
      regenMarkov();
    }
    if (command === 'reacc') {
      console.log(message);
      let reacc = getReacc(message);
      console.log('reacc: ' + reacc);
      if (reacc === 'help') {
        let help_message: string = 'Available reaccs: ';
        for (let k in pleb_reaccs) {
          help_message = help_message + k + ' ';
        }
        message.channel.send(help_message);
      } else if (pleb_reaccs[reacc] !== undefined) {
        if (message.reference) {
          let reacc_message_id: string | null = message.reference.messageID;
          if (reacc_message_id !== null) {
            message.channel.messages.fetch(reacc_message_id).then(m => {
              m.react(pleb_reaccs[reacc]);
            });
          }
        } else {
          message.channel.send('You need to reply to a message to use this command you dumb fuck.');
        }
      }
    }
    if (command === null) {
      console.log('Listening...');
      if (!message.author.bot) {
        const dbObj: MessageRecord = {
          string: message.content,
          id: message.id,
        };
        if (message.attachments.size > 0) {
          dbObj.attachment = message.attachments.values().next().value.url;
        }
        messageCache.push(dbObj);
        if (getRandomInt(25) === 1) {
          message.react(reaccs[getRandomInt(reaccs.length)]);
        }
        let random_k = getRandomInt(1000);
        if (client.user && message.mentions.has(client.user)) {
          generateResponse(message);
        } else if (getRandomInt(50) === 1) {
          generateResponse(message);
        } else if (random_k === 1) {
          // message.channel.send(shitpost);
        } else if (random_k === 2) {
          // message.channel.send('usually she calls me daddy but tonight she calls me father');
        } else if (random_k === 3) {
          message.channel.send('waiting for kwong to post solutions');
        } else if (random_k === 4) {
          // message.channel.send(shitpost2);
        }
      }
    }
    if (command === inviteCmd) {
      const avatarURL = client.user?.avatarURL() || undefined;
      const richem = new Discord.MessageEmbed()
        .setAuthor(`Invite ${client.user?.username}`, avatarURL)
        .setThumbnail(avatarURL as string)
        .addField(
          'Invite',
          `[Invite ${client.user?.username} to your server](https://discordapp.com/oauth2/authorize?client_id=${client.user?.id}&scope=bot)`
        );

      message.channel.send(richem).catch(() => {
        message.author.send(richem);
      });
    }
  }
});

client.on('messageDelete', message => {
  // console.log('Adding message ' + message.id + ' to deletion cache.')
  deletionCache.push(message.id);
  console.log('deletionCache:', deletionCache);
});

loadConfig();
schedule.scheduleJob('0 4 * * *', () => regenMarkov());

/*
const {google} = require('googleapis');
const youtube = google.youtube('v3');

const jomboyChannelId = 'UCl9E4Zxa8CVr2LBLD0_TaNg';
const googleAuthKey = 'AIzaSyBq0TemeWryt0ewlPD8DZ2WuirLdihSK3s';

const fastify = require('fastify')({ logger: true })

const xmlParser = require('fast-xml-parser')

const { URLSearchParams } = require('url')
const fetch = require('node-fetch')

// add an xml parser
fastify.addContentTypeParser('application/atom+xml', { parseAs: 'string' }, function (req: any, xmlString: any, done: any) {
  try {
    const body = xmlParser.parse(xmlString, {
      attributeNamePrefix: '',
      ignoreAttributes: false
    })
    done(null, body)
  } catch (error) {
    done(error)
  }
})

// this endpoint needs for authentication
fastify.get('/', (request: any, reply: any) => {
  reply.send(request.query['hub.challenge'])
});

// this endpoint will get the updates
fastify.post('/', (request: any, reply: any) => {
  console.log(JSON.stringify(request.body, null, 2))
  reply.code(204)
  reply.send('ok')
});

fastify.listen(8080)
  .then(() => {
    // after the server has started, subscribe to the hub

    // Parameter list: https://pubsubhubbub.github.io/PubSubHubbub/pubsubhubbub-core-0.4.html#rfc.section.5.1
    const params = new URLSearchParams();
    params.append('hub.callback', 'https://1f3dd0c63e78.ngrok.io'); // you must have a public endpoint. get it with "ngrok http 8080"
    params.append('hub.mode', 'subscribe');
    params.append('hub.topic', 'https://www.youtube.com/xml/feeds/videos.xml?channel_id=' + jomboyChannelId);
    params.append('hub.lease_seconds', '');
    params.append('hub.secret', '');
    params.append('hub.verify', 'sync');
    params.append('hub.verify_token', '');

    return fetch('https://pubsubhubbub.appspot.com/subscribe', {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: params,
      method: 'POST'
    });
  })
  .then((res: any) => {
    console.log(`The status must be 204. Received ${res.status}`)

    // shows the error if something went wrong
    if (res.status !== 204) {
      return res.text().then((txt: any) => console.log(txt))
    }
  });

*/
