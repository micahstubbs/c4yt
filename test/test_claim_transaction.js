const {equal} = require('tap');
const {ok} = require('tap');
const {throws} = require('tap');
const {Transaction} = require('bitcoinjs-lib');

const {claimTransaction} = require('./../swaps');

const fixtures = {
  claim_transaction: '01000000000101156a861dc99d2a12a5ff63f710d132f6eba774648efc006332b674aad5b47b5100000000000000000001e0bc052a01000000160014153607c57d789c3da20a812aaf19a17bb9abe0ea03473044022017e6536de93982d2e0da4272c040f05ebeb5ecd41544a20645d34c202609ff63022018dee2d7e1ea74b3f72aaef4f5ac8e872585fa60715240a6a78db57dcb2d821b01200d0f000cd0c000c0ab0000000a0c00b0d00000c000000b0c0e0ca00e00000a0b6876a820035ff161edf1fb1db2c334f3b85e736cfe49d117fcf0d4741146c148941488ee8763752102cab08827d262384d8e1349078c8432d671bb468b9f60c7a298c8a9c0137dd96b67027802b17576a914e7c4f66eabfdbae4861f3de5331ab4f5622ad83f8868acb6010000',
  current_block_height: 438,
  destination: 'tb1qz5mq03ta0zwrmgs2sy427xdp0wu6hc829f8aar',
  dust_tokens: 10,
  fee_tokens_per_vbyte: 100,
  invalid_p2sh_output_script: 'a91495893fb0b68f0fc575105cbb45fcf76c9324c00287',
  max_fee: 1e5,
  p2sh_claim_transaction: '01000000000101156a861dc99d2a12a5ff63f710d132f6eba774648efc006332b674aad5b47b5100000000232200200715b5f54b7148bc733c90d62c3f0b5d1691804702db8a2b8fe83d1651b7f85d000000000134af052a01000000160014153607c57d789c3da20a812aaf19a17bb9abe0ea03473044022008584fabe656e746492aaba41fa9331503376c1b5d83e34137f7908c8672295a022079e86f7e9607aa2a491e05c18b64c21e9792dd66a37378c99cc523c9feadde1401200d0f000cd0c000c0ab0000000a0c00b0d00000c000000b0c0e0ca00e00000a0b6876a820035ff161edf1fb1db2c334f3b85e736cfe49d117fcf0d4741146c148941488ee8763752102cab08827d262384d8e1349078c8432d671bb468b9f60c7a298c8a9c0137dd96b67027802b17576a914e7c4f66eabfdbae4861f3de5331ab4f5622ad83f8868acb6010000',
  p2sh_output_script: 'a91495893fb0b68f0fc575105cbb45fcf76c9324c43287',
  p2sh_p2wsh_output_script: 'a914cb5843af4f313c4bf2c7149c0c3663a2100baf5a87',
  p2wsh_output_script: '0020df5f7d047361e9b70a26b6346dcb01e33480e5304b517ff2599a496dc5ffbd59',
  preimage: '0d0f000cd0c000c0ab0000000a0c00b0d00000c000000b0c0e0ca00e00000a0b',
  private_key: 'cSWTkyuuPpVrkrqqr2JuydydUvXzzM9PJgPhTLFFAJmuA4RwLiQj',
  utxo: {
    redeem: '76a820035ff161edf1fb1db2c334f3b85e736cfe49d117fcf0d4741146c148941488ee8763752102cab08827d262384d8e1349078c8432d671bb468b9f60c7a298c8a9c0137dd96b67027802b17576a914e7c4f66eabfdbae4861f3de5331ab4f5622ad83f8868ac',
    vout: 0,
    tokens: 5000000000,
    transaction_id: '517bb4d5aa74b6326300fc8e6474a7ebf632d110f763ffa5122a9dc91d866a15'
  },
};

// Test a standard claim transaction
{
  const {transaction} = claimTransaction({
    current_block_height: fixtures.current_block_height,
    destination: fixtures.destination,
    fee_tokens_per_vbyte: fixtures.fee_tokens_per_vbyte,
    preimage: fixtures.preimage,
    private_key: fixtures.private_key,
    utxos: [{
      redeem: fixtures.utxo.redeem,
      script: fixtures.p2wsh_output_script,
      tokens: fixtures.utxo.tokens,
      transaction_id: fixtures.utxo.transaction_id,
      vout: fixtures.utxo.vout,
    }],
  });

  equal(transaction, fixtures.claim_transaction, 'NormalWitnessTransaction');

  const tx = Transaction.fromHex(transaction);

  equal(tx.outs.length, [fixtures.utxo].length, 'OnlyOneOutput');
  ok(fixtures.utxo.tokens - tx.outs[0].value < fixtures.max_fee, 'NormalFees');
}

// Test a nested p2sh claim transaction
{
  const {transaction} = claimTransaction({
    current_block_height: fixtures.current_block_height,
    destination: fixtures.destination,
    fee_tokens_per_vbyte: fixtures.fee_tokens_per_vbyte,
    preimage: fixtures.preimage,
    private_key: fixtures.private_key,
    utxos: [{
      redeem: fixtures.utxo.redeem,
      script: fixtures.p2sh_p2wsh_output_script,
      tokens: fixtures.utxo.tokens,
      transaction_id: fixtures.utxo.transaction_id,
      vout: fixtures.utxo.vout,
    }],
  });

  equal(transaction, fixtures.p2sh_claim_transaction, 'NestedP2SHTransaction');

  const tx = Transaction.fromHex(transaction);

  equal(tx.outs.length, [fixtures.utxo].length);

  ok(fixtures.utxo.tokens - tx.outs[0].value < fixtures.max_fee, 'NormalFees');
}

// Test a p2sh legacy claim transaction
{
  const {transaction} = claimTransaction({
    current_block_height: fixtures.current_block_height,
    destination: fixtures.destination,
    fee_tokens_per_vbyte: fixtures.fee_tokens_per_vbyte,
    preimage: fixtures.preimage,
    private_key: fixtures.private_key,
    utxos: [{
      redeem: fixtures.utxo.redeem,
      script: fixtures.p2sh_output_script,
      tokens: fixtures.utxo.tokens,
      transaction_id: fixtures.utxo.transaction_id,
      vout: fixtures.utxo.vout,
    }],
  });

  equal(transaction, '0100000001156a861dc99d2a12a5ff63f710d132f6eba774648efc006332b674aad5b47b5100000000d4483045022100e0b91f00dfce00aa126c7b247981b57f9a648f3183e8c7a6d94664cb42b51368022034f02849acc0b2d353b3c51ecabab42ae95c085d00b6d062961c29829330cfc001200d0f000cd0c000c0ab0000000a0c00b0d00000c000000b0c0e0ca00e00000a0b4c6876a820035ff161edf1fb1db2c334f3b85e736cfe49d117fcf0d4741146c148941488ee8763752102cab08827d262384d8e1349078c8432d671bb468b9f60c7a298c8a9c0137dd96b67027802b17576a914e7c4f66eabfdbae4861f3de5331ab4f5622ad83f8868ac00000000018c7f052a01000000160014153607c57d789c3da20a812aaf19a17bb9abe0eab6010000');
}

// Test a claim transaction with a bad script pub fails
{
  throws(() => {
    return claimTransaction({
      current_block_height: fixtures.current_block_height,
      destination: fixtures.destination,
      fee_tokens_per_vbyte: fixtures.fee_tokens_per_vbyte,
      preimage: fixtures.preimage,
      private_key: fixtures.private_key,
      utxos: [{
        redeem: fixtures.utxo.redeem,
        script: fixtures.p2wsh_output_script,
        tokens: fixtures.dust_tokens,
        transaction_id: fixtures.utxo.transaction_id,
        vout: fixtures.utxo.vout,
      }],
    });
  },
  new Error('FeesTooHighToClaim'));
}

// Test a claim transaction which cannot proceed because the outputs are dust
{
  throws(() => {
    return claimTransaction({
      current_block_height: fixtures.current_block_height,
      destination: fixtures.destination,
      fee_tokens_per_vbyte: fixtures.fee_tokens_per_vbyte,
      preimage: fixtures.preimage,
      private_key: fixtures.private_key,
      utxos: [{
        redeem: fixtures.utxo.redeem,
        script: fixtures.invalid_p2sh_output_script,
        tokens: fixtures.dust_tokens,
        transaction_id: fixtures.utxo.transaction_id,
        vout: fixtures.utxo.vout,
      }],
    });
  },
  new Error('UnrecognizedScriptPub'));
}

