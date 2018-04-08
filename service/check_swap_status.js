const asyncAuto = require('async/auto');
const {Transaction} = require('bitcoinjs-lib');

const completeSwapTransaction = require('./complete_swap_transaction');
const findSwapTransaction = require('./find_swap_transaction');
const {getBlockchainInfo} = require('./../chain');
const {returnResult} = require('./../async-util');
const serverSwapKeyPair = require('./server_swap_key_pair');
const {swapAddress} = require('./../swaps');
const {swapOutput} = require('./../swaps');
const {swapScriptDetails} = require('./../swaps');

const blockSearchDepth = 9;
const minSwapTokens = 1e5;
const minBlocksUntilRefundHeight = 70;
const network = 'testnet';
const requiredConfCount = 0;

/** Check the status of a swap

  {
    destination_public_key: <Destination Public Key String>
    invoice: <Lightning Invoice String>
    payment_hash: <Payment Hash String>
    redeem_script: <Redeem Script Hex String>
    refund_public_key_hash: <Refund Public Key Hash String>
    swap_key_index: <Swap Key Index Number>
    timeout_block_height: <Timeout Block Height Number>
  }

  @returns via cbk
  {
    [conf_wait_count]: <Confirmations to Wait Number>
    [output_index]: <Output Index Number>
    [output_tokens]: <Output Tokens Number>
    [payment_secret]: <Payment Secret Hex String>
    transaction_id: <Transaction Id Hex String>
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Get the current chain height
    getChainInfo: cbk => getBlockchainInfo({network}, cbk),

    // Check arguments
    validate: cbk => {
      if (!args.destination_public_key) {
        return cbk([400, 'ExpectedDestinationPublicKey']);
      }

      if (!args.invoice) {
        return cbk([400, 'ExpectedInvoice']);
      }

      if (!args.payment_hash) {
        return cbk([400, 'ExpectedPaymentHash']);
      }

      if (!args.redeem_script) {
        return cbk([400, 'ExpectedRedeemScript']);
      }

      if (!args.refund_public_key_hash) {
        return cbk([400, 'ExpectedRefundPublicKeyHash']);
      }

      if (!args.swap_key_index) {
        return cbk([400, 'ExpectedSwapKeyIndex']);
      }

      if (!args.timeout_block_height) {
        return cbk([400, 'ExpectedTimeoutBlockHeight']);
      }

      return cbk();
    },

    // Pull out the swap keypair from the HD seed
    serverKeyPair: ['validate', ({}, cbk) => {
      try {
        return cbk(null, serverSwapKeyPair({
          network,
          index: args.swap_key_index
        }));
      } catch (e) {
        return cbk([500, 'ExpectedValidKeyPair', e]);
      }
    }],

    // Derive the swap address
    swapAddress: ['validate', ({}, cbk) => {
      try {
        return cbk(null, swapAddress({
          destination_public_key: args.destination_public_key,
          payment_hash: args.payment_hash,
          refund_public_key_hash: args.refund_public_key_hash,
          timeout_block_height: args.timeout_block_height,
        }));
      } catch (e) {
        return cbk([500, 'DeriveSwapAddressFailure', e]);
      }
    }],

    // Derive the swap info from the redeem script
    swapDetails: ['validate', ({}, cbk) => {
      try {
        return cbk(null, swapScriptDetails({
          redeem_script: args.redeem_script
        }));
      } catch (e) {
        return cbk([400, 'FailedToDeriveSwapDetails', e]);
      }
    }],

    // Make sure that the destination public key matches a server key
    checkDestinationPublicKey: ['serverKeyPair', 'swapDetails', (res, cbk) => {
      const redeemScriptPublicKey = res.swapDetails.destination_public_key;
      const serverPublicKey = res.serverKeyPair.public_key;

      if (serverPublicKey !== redeemScriptPublicKey) {
        return cbk([403, 'InvalidDestinationKey']);
      }

      return cbk();
    }],

    // Check that there is enough time left to swap
    checkTimelockHeight: ['swapDetails', 'getChainInfo', (res, cbk) => {
      const currentHeight = res.getChainInfo.current_height;
      const refundHeight = res.swapDetails.timelock_block_height;

      const blocksUntilRefundHeight = refundHeight - currentHeight;

      if (blocksUntilRefundHeight < minBlocksUntilRefundHeight) {
        return cbk([410, 'TradeExpired']);
      }

      return cbk();
    }],

    // Search for the swap transaction
    findSwapTransaction: [
      'checkDestinationPublicKey',
      'checkTimelockHeight',
      ({}, cbk) =>
    {
      return findSwapTransaction({
        network,
        block_search_depth: blockSearchDepth,
        destination_public_key: args.destination_public_key,
        payment_hash: args.payment_hash,
        refund_public_key_hash: args.refund_public_key_hash,
        timeout_block_height: args.timeout_block_height,
      },
      cbk);
    }],

    // Make sure that the transaction has been found
    checkTransactionDetected: ['findSwapTransaction', (res, cbk) => {
      if (!res.findSwapTransaction.transaction) {
        return cbk([402, 'FundingTransactionNotFound']);
      }

      return cbk();
    }],

    // Determine the number of remaining confirmations before swap execution
    remainingConfs: ['checkTransactionDetected', (res, cbk) => {
      const confCount = res.findSwapTransaction.confirmation_count || 0;

      return cbk(null, Math.max(requiredConfCount - confCount, 0));
    }],

    // Pending swap details
    pendingDetails: ['remainingConfs', (res, cbk) => {
      let swapUtxo;

      try {
        swapUtxo = swapOutput({
          p2sh_output_script: res.swapAddress.p2sh_output_script,
          p2sh_p2wsh_output_script: res.swapAddress.p2sh_p2wsh_output_script,
          transaction: res.findSwapTransaction.transaction,
          witness_output_script: res.swapAddress.witness_output_script,
        });
      } catch (e) {
        return cbk([500, 'ExpectedSwapUtxoDetails', e]);
      }

      if (swapUtxo.output_tokens < minSwapTokens) {
        return cbk([400, 'RejectedDustSwap']);
      }

      return cbk(null, {
        conf_wait_count: res.remainingConfs,
        output_index: swapUtxo.output_index,
        output_tokens: swapUtxo.output_tokens,
        transaction_id: swapUtxo.transaction_id,
      });
    }],

    // Complete the swap transaction
    swapTransaction: [
      'checkTransactionDetected',
      'findSwapTransaction',
      'remainingConfs',
      'serverKeyPair',
      ({findSwapTransaction, remainingConfs, serverKeyPair}, cbk) =>
    {
      // Exit early and abort swap when there are remaining confirmations
      if (!!remainingConfs) {
        return cbk();
      }

      return completeSwapTransaction({
        network,
        invoice: args.invoice,
        private_key: serverKeyPair.private_key,
        redeem_script: args.redeem_script,
        transaction: findSwapTransaction.transaction,
      },
      cbk);
    }],

    // Current swap status
    swapStatus: ['pendingDetails', 'swapTransaction', (res, cbk) => {
      if (!!res.swapTransaction) {
        return cbk(null, {
          payment_secret: res.swapTransaction.payment_secret,
          transaction_id: res.swapTransaction.transaction_id,
        });
      } else {
        return cbk(null, {
          conf_wait_count: res.pendingDetails.conf_wait_count,
          output_index: res.pendingDetails.output_index,
          output_tokens: res.pendingDetails.output_tokens,
          transaction_id: res.pendingDetails.transaction_id,
        });
      }
    }],
  },
  returnResult({of: 'swapStatus'}, cbk));
};

