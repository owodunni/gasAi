import Web3 from "web3";
import type {Transaction} from "web3-eth";
import fs from "fs";


const rpcUrl = `ws://192.168.92.202:8546`;

// @ts-ignore
const web3 = new Web3(rpcUrl);

type PendingTx = { tx: Pick<Transaction, "maxPriorityFeePerGas" | "maxFeePerGas" | "gas" | "gasPrice">, submitted: string };
type MinedTx = PendingTx & { mined: string };

const pendingTransactions: { [hash: string]: PendingTx } = {};

const minedTransactions: { [hash: string]: MinedTx } = {};

web3.eth
    .subscribe('pendingTransactions', async (error: Error) => {
        if (error) console.log('error', error);
    })
    .on('data', async (hash: string) => {
        if (Object.keys(pendingTransactions).length > 1000) {
            console.log("Pending tx cache is full");
            return;
        }
        const {maxFeePerGas, maxPriorityFeePerGas, gas, gasPrice} = await web3.eth.getTransaction(hash)
        pendingTransactions[hash] = {tx:
            {maxFeePerGas, maxPriorityFeePerGas, gas, gasPrice}, submitted: new Date().toISOString()};
    });

web3.eth.subscribe("newBlockHeaders", (error: Error) => {
    if (error) console.log('error', error);
}).on("data", async (blockHeader: { hash: string }) => {
   const {transactions} = await web3.eth.getBlock(blockHeader.hash, true);
   for (let i = 0; i < transactions.length; i++) {
       const tx = transactions[i];
       if (tx.hash in pendingTransactions) {
           const pendingTx = pendingTransactions[tx.hash];
              minedTransactions[tx.hash] = {...pendingTx, mined: new Date().toISOString()};
           delete pendingTransactions[tx.hash];
       }
       if(Object.keys(minedTransactions).length > 100) {
              console.log("Mined tx cache is full, dumping txs to file");
              fs.writeFileSync("txs.json", JSON.stringify(minedTransactions));
              process.exit(0);
       }
       else{
           console.log("Mined tx cache size", Object.keys(minedTransactions).length);
       }
   }
});

//process.exit(0);

