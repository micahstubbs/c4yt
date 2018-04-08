const {address} = require('bitcoinjs-lib');
const {crypto} = require('bitcoinjs-lib');
const {networks} = require('bitcoinjs-lib');
const {script} = require('bitcoinjs-lib');

const {hash160} = crypto;
const {scriptHash} = script;
const {sha256} = crypto;
const {testnet} = networks;
const {toASM} = script;
const {witnessScriptHash} = script;

const encodeScriptHash = scriptHash.output.encode;
const {fromOutputScript} = address;

/** Given a pkhash swap script, its details.

  {
    redeem_script: <Redeem Script Hex String>
  }

  @throws
  <Error> on derive issue

  @returns
  {
    destination_public_key: <Destination Public Key Hex String>
    p2sh_address: <Pay to Script Hash Base58 Address String>
    p2sh_output_script: <Pay to Script Hash Output Hex String>
    p2sh_p2wsh_address: <Nested Pay to Witness Script Address String>
    p2sh_p2wsh_output_script: <P2SH Nested Output Script Hex String>
    p2wsh_address: <Pay to Witness Script Hash Address String>
    payment_hash: <Payment Hash Hex String>
    refund_p2wpkh_address: <Refund P2WPKH Address String>
    refund_public_key_hash: <Refund Public Key Hash Hex String>
    timelock_block_height: <Locked Until Height Number>
    witness_output_script: <Witness Output Script Hex String>
  }
*/
module.exports = args => {
  if (!args.redeem_script) {
    throw new Error('ExpectedRedeemScript');
  }

  let cltv;
  let destinationPublicKey;
  let paymentHash;
  const redeemScript = Buffer.from(args.redeem_script, 'hex');
  let refundPublicKeyHash;

  const scriptAssembly = toASM(script.decompile(redeemScript)).split(' ');

  switch (scriptAssembly.length) {
  case 12:
    {
      const [
        OP_SHA256, pkPaymentHash, OP_EQUAL,
        OP_IF,
          pkDestinationPublicKey,
        OP_ELSE,
          pkCltv, OP_CHECKLOCKTIMEVERIFY, OP_DROP,
          pkRefundPublicKey,
        OP_ENDIF,
        OP_CHECKSIG,
      ] = scriptAssembly;

      if (OP_SHA256 !== 'OP_SHA256') {
        throw new Error('ExpectedSha256');
      }

      if (!pkPaymentHash || pkPaymentHash.length !== 32 * 2) {
        throw new Error('ExpectedStandardPaymentHash');
      }

      paymentHash = pkPaymentHash;

      if (OP_EQUAL !== 'OP_EQUAL') {
        throw new Error('ExpectedOpEqual');
      }

      if (OP_IF !== 'OP_IF') {
        throw new Error('ExpectedOpIf');
      }

      if (!pkDestinationPublicKey || pkDestinationPublicKey.length !== 66) {
        throw new Error('ExpectedDestinationKey');
      }

      destinationPublicKey = pkDestinationPublicKey;

      if (OP_ELSE !== 'OP_ELSE') {
        throw new Error('ExpectedOpElse');
      }

      if (!pkCltv) {
        throw new Error('ExpectedCltv');
      }

      cltv = pkCltv;

      if (OP_CHECKLOCKTIMEVERIFY !== 'OP_CHECKLOCKTIMEVERIFY') {
        throw new Error('ExpectedOpCltv');
      }

      if (OP_DROP !== 'OP_DROP') {
        throw new Error('ExpectedOpDrop');
      }

      if (!pkRefundPublicKey || pkRefundPublicKey.length !== 33 * 2) {
        throw new Error('ExpectedRefundPublicKey');
      }

      refundPublicKeyHash = hash160(Buffer.from(pkRefundPublicKey, 'hex'))
        .toString('hex');

      if (OP_ENDIF !== 'OP_ENDIF') {
        throw new Error('ExpectedOpEndIf');
      }

      if (OP_CHECKSIG !== 'OP_CHECKSIG') {
        throw new Error('ExpectedCheckSig');
      }
    }
    break;

  case 17:
    {
      const [
        OP_DUP,
        OP_SHA256, pkhPaymentHash, OP_EQUAL,
        OP_IF,
          OP_DROP,
          pkhDestinationPublicKey,
        OP_ELSE,
          pkhCltv, OP_CHECKLOCKTIMEVERIFY, OP_DROP2,
          OP_DUP2, OP_HASH160, pkhRefundPublicKeyHash, OP_EQUALVERIFY,
        OP_ENDIF,
        OP_CHECKSIG,
      ] = scriptAssembly;

      if (OP_DUP !== 'OP_DUP') {
        throw new Error('ExpectedInitialOpDup');
      }

      if (OP_SHA256 !== 'OP_SHA256') {
        throw new Error('ExpectedSha256');
      }

      if (!pkhPaymentHash || pkhPaymentHash.length !== 32 * 2) {
        throw new Error('ExpectedStandardPaymentHash');
      }

      paymentHash = pkhPaymentHash;

      if (OP_EQUAL !== 'OP_EQUAL') {
        throw new Error('ExpectedOpEqual');
      }

      if (OP_IF !== 'OP_IF') {
        throw new Error('ExpectedOpIf');
      }

      if (OP_DROP !== 'OP_DROP') {
        throw new Error('ExpectedOpDrop');
      }

      if (!pkhDestinationPublicKey || pkhDestinationPublicKey.length !== 66) {
        throw new Error('ExpectedDestinationKey');
      }

      destinationPublicKey = pkhDestinationPublicKey;

      if (OP_ELSE !== 'OP_ELSE') {
        throw new Error('ExpectedOpElse');
      }

      if (!pkhCltv) {
        throw new Error('ExpectedCltv');
      }

      cltv = pkhCltv;

      if (OP_CHECKLOCKTIMEVERIFY !== 'OP_CHECKLOCKTIMEVERIFY') {
        throw new Error('ExpectedOpCltv');
      }

      if (OP_DROP2 !== 'OP_DROP') {
        throw new Error('ExpectedOpDrop');
      }

      if (OP_DUP2 !== 'OP_DUP') {
        throw new Error('ExpectedOpDup');
      }

      if (OP_HASH160 !== 'OP_HASH160') {
        throw new Error('ExpectedOpHash160');
      }

      if (!pkhRefundPublicKeyHash || pkhRefundPublicKeyHash.length !== 20*2) {
        throw new Error('ExpectedRefundPublicKeyHash');
      }

      refundPublicKeyHash = pkhRefundPublicKeyHash;

      if (OP_EQUALVERIFY !== 'OP_EQUALVERIFY') {
        throw new Error('ExpectedOpEqualVerify');
      }

      if (OP_ENDIF !== 'OP_ENDIF') {
        throw new Error('ExpectedOpEndIf');
      }

      if (OP_CHECKSIG !== 'OP_CHECKSIG') {
        throw new Error('ExpectedCheckSig');
      }
    }
    break;

  default:
    throw new Error('InvalidScriptLength');
    break;
  }

  // Legacy P2SH output script
  const p2shLegacyOutput = encodeScriptHash(hash160(redeemScript));

  const witnessProgram = witnessScriptHash.output.encode(sha256(redeemScript));

  const p2shWrappedWitnessProg = encodeScriptHash(hash160(witnessProgram));

  const p2shNestedAddr = fromOutputScript(p2shWrappedWitnessProg, testnet);

  const refundHash = Buffer.from(refundPublicKeyHash, 'hex');

  const scriptPub = script.witnessPubKeyHash.output.encode(refundHash);
  const refundP2wpkhAddress = address.fromOutputScript(scriptPub, testnet);

  const lockHeight = Buffer.from(cltv, 'hex').readUIntLE(0, cltv.length / 2);

  return {
    destination_public_key: destinationPublicKey,
    p2sh_address: fromOutputScript(p2shLegacyOutput, testnet),
    p2sh_output_script: p2shLegacyOutput.toString('hex'),
    p2sh_p2wsh_address: p2shNestedAddr,
    p2sh_p2wsh_output_script: p2shWrappedWitnessProg.toString('hex'),
    p2wsh_address: address.fromOutputScript(witnessProgram, testnet),
    payment_hash: paymentHash,
    refund_p2wpkh_address: refundP2wpkhAddress,
    refund_public_key_hash: refundPublicKeyHash,
    timelock_block_height: lockHeight,
    witness_output_script: witnessProgram.toString('hex'),
  };
};

