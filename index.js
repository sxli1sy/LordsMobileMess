var Cap = require('cap').Cap;
var decoders = require('cap').decoders;
var PROTOCOL = decoders.PROTOCOL;

let colors = require('colors');

var c = new Cap();
var device = Cap.findDevice('192.168.1.94');
const port = 11111; // You have to set YOUR port here, go to wireshark and check where lm sends the packets
var filter = 'tcp and dst port ' + port + ' or dst port 5991'; // 5991 is lords mobile's srv (or proxy) port.
var bufSize = 10 * 1024 * 1024;
var buffer = Buffer.alloc(65535);

var linkType = c.open(device, filter, bufSize, buffer);

const LOG_MODE = false; // PLEASE IGNORE THAT SHITTTTT
const SMALL_LOG_MODE = false;

c.setMinBytes && c.setMinBytes(0);

let seqNumber = null;

c.on('packet', function (nbytes, trunc) {

  SMALL_LOG_MODE && console.log('packet: length ' + nbytes + ' bytes, truncated? '
    + (trunc ? 'yes' : 'no'));

  // raw packet data === buffer.slice(0, nbytes)

  if (linkType === 'ETHERNET') {
    var ret = decoders.Ethernet(buffer);

    if (ret.info.type === PROTOCOL.ETHERNET.IPV4) {
      LOG_MODE && console.log('Decoding IPv4 ...');

      ret = decoders.IPV4(buffer, ret.offset);
      LOG_MODE && console.log('> from: ' + ret.info.srcaddr + ' to ' + ret.info.dstaddr);


      if (ret.info.protocol === PROTOCOL.IP.TCP) {
        var datalen = ret.info.totallen - ret.hdrlen;

        LOG_MODE && console.log('Decoding TCP ...');

        ret = decoders.TCP(buffer, ret.offset);
        LOG_MODE && console.log('> from port: ' + ret.info.srcport + ' to port: ' + ret.info.dstport + '');
        datalen -= ret.hdrlen;
        //console.log(buffer.toString('binary', ret.offset, ret.offset + datalen));

        let data = buffer.slice(ret.offset, ret.offset + datalen);
        SMALL_LOG_MODE && console.log(data);

        handleGamePacket(data, data.length);

        SMALL_LOG_MODE && !LOG_MODE && console.log();
        SMALL_LOG_MODE && !LOG_MODE && console.log();

      } else
        console.log('Unsupported IPv4 protocol: ' + PROTOCOL.IP[ret.info.protocol]);
    } else
      console.log('Unsupported Ethertype: ' + PROTOCOL.ETHERNET[ret.info.type]);
  }
});

function handleGamePacket(bytes, len) {
  if (len < 4) return; // console.log("Parse error: len < 4");

  let dataLen = bytes.slice(0, 2).readIntLE(0, 2);
  let packetID = bytes.slice(2, 4).readIntLE(0, 2);

  if (packetID == 3003) {
    handleChatPacket(bytes, dataLen);
  }

  if (packetID == 2220) {
    handleMapPlus(bytes, dataLen);
  }

  if (packetID == 2854) {
    handleSbNeedHelp(bytes, dataLen);
  }

}

function handleChatPacket(bytes, dataLen) {
  console.log("> chat packet");
  const localGuild = 'TAG';

  //console.log(bytes.slice(4, dataLen));

  let playerName = bytes.slice(36, 49).toString('binary', 0, 13);
  let guildTag = bytes.slice(50, 54).toString('binary', 0, 3);
  let text = bytes.slice(58, dataLen).toString('binary', 0, dataLen - 58);

  console.log(`${guildTag != localGuild ? "<GLOBAL>".red : "<LOCAL>".green} ${`[${guildTag}]`.yellow} ${playerName.cyan}: ${text}`);
  }
}

function handleMapPlus(bytes, dataLen) {
  // console.log("> mapdataplus packet");
}

function handleSbNeedHelp(bytes, dataLen) {
  let record = bytes.slice(4, 4 + 8).readUint32LE(0);

  let rank = bytes.slice(4 + 6, 4 + 7).readInt8(0).toString();
  let name = bytes.slice(4 + 7, 4 + 20).toString();
  let alreadyHelp = bytes.slice(4 + 24, 4 + 25).readInt8(0).toString();
  let maxHelp = bytes.slice(4 + 25, 4 + 26).readInt8(0).toString();

  console.log(`[R${rank}] ${name} needs help! [${alreadyHelp}/${maxHelp}] | Record = ${record}`); // record is kind of an ID, planning on using it to set up auto help pressing
}
