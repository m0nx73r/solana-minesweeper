{
	//const clusterApiUrl = web3.clusterApiUrl('mainnet');
	// const clusterApiUrl = web3.clusterApiUrl('devnet');
	// const clusterApiUrl = 'https://ssc-dao.genesysgo.net/'; //mainnet
	// const clusterApiUrl = 'https://psytrbhymqlkfrhudd.dev.genesysgo.net:8899/'; //devnet
	const clustApiUrl = 'https://api.devnet.solana.com'; //devnet
	
	
	const generate_test_transac_id = false;
	//const recipient_pubkey = '..';

	if (solanaWeb3 == null) throw new Error('solanaWeb3 missing');

	function PhantomWallet() {
		let self = this;
		self.wallet_pubkey = null;
		self.cur_transac_err = null;
		self.lastTransacId = null;
		self.connectWallet = async function() { //prompts user
			if (window.solana != null) {
				var res = await window.solana.connect();
				console.log('phantom wallet connect:', res);
				console.log('phantom wallet pubKey:', res.publicKey.toString());
				this.wallet_pubkey = res.publicKey.toString();
			} else {
				console.error('phantom wallet connect: no phantom wallet found');
			}
		};
		self.disconnectWallet = function() {
			if (window.solana != null) {
				console.log('phantom wallet disconnect');
				window.solana.disconnect();
			} else {
				console.error('phantom wallet disconnect: no phantom wallet found');
			}
		};
		self.isConnected = function(){
			if(window.solana != null){
				console.log("phantom wallet isConnected()");
				if(window.solana.isConnected)
					return true;
				else
					return false;
			}
			else{
				console.error("no phantom");
			}
		}
		self.tryGetWalletPubkey = function() { //returns null or string
			return self.wallet_pubkey;
		};
		self.requestTransac = function(lamports, to_pubkey) {
			self.cur_transac_err = null;
			self.lastTransacId = null;
			console.log('requested transaction', lamports, to_pubkey);

			if (generate_test_transac_id) {
				setTimeout(() => {
					s = '';
					const chars = 'abcdefghijklmnopqrstuvxywz';
					for (let i = 0; i < 16; i++) s += chars[Math.floor(Math.random() * chars.length)];
					self.lastTransacId = "test_transac_id_wallet_" + s;
				}, 1000);
			} else {
				(async function() {
					let s_err = null;
					let onTransacErr = s_err_ => s_err = s_err_;
					let onOtherErr = s_err_ => s_err = s_err_;
					let signature = await createPhantomTransaction(clusterApiUrl, to_pubkey, lamports, onTransacErr, onOtherErr, 'confirmed');
					if (s_err != null) {
						console.error('createPhantomTransaction: transaction error:', s_err);
						self.cur_transac_err = s_err;
						return 0;
					} else {
						console.log('transaction_id/signature:', signature);
						self.lastTransacId = signature;
						return 1;
					}
				})();
			}
		};


		async function createPhantomTransaction(clusterApiUrl, to_pubKey, lamports, onTransacErr, onOtherErr) {
			if (!window.solana || !window.solana.isPhantom) return { signature: null, err: 'no phantom wallet' }//throw new Error('phantom provider not found');
			
			provider = window.solana;
			if (provider == null) throw new Error('could not open phantom wallet(1)');
			if (!provider.isPhantom) throw new Error('could not open phantom wallet(2)');
				
			await self.connectWallet(); //connects if not connected

			const web3 = solanaWeb3;
			const connection = new web3.Connection(clusterApiUrl, 'confirmed');
			let transaction = await createTransferTransaction(connection, provider, to_pubKey, lamports);

			let rslt = await provider.signAndSendTransaction(transaction);
			if (rslt == null) {
				console.error('transaction failed - rslt == null');
				return null;
			} else {
				const { signature } = rslt;
				console.log('createPhantomTransaction: to_pubkey', to_pubKey, 'signature', signature, 'lamports', lamports);
				let res;
				try {
					res = await connection.confirmTransaction(signature);
				} catch (err) { //may have error: "Transaction was not confirmed in 30.04 seconds. It is unknown if it succeeded or failed. Check signrature ... using the Solana Explorer or CLI"
					console.error('createPhantomTransaction: handled transacErr:', err);
					let s_err = err.message;
					if (s_err.startsWith('Transaction was not confirmed in')) {
						s_err = 'Transaction confirmation timeout';
					} else {
						s_err = 'unknown error\nconsole for more info';
					}
					onTransacErr(s_err);
					return;
				}
				if (res.value.err != null) {
					console.error('createPhantomTransaction: handled anyErr:', res.value.err);
					let s_err = res.value.err;
					onAnyErr(s_err);
					return;
				}
				console.log('createPhantomTransaction: transaction confirmation: ', res);
				return signature; //return { signature, err: res.value.err };
			}
		}
		const createTransferTransaction = async (connection, provider, to_pubKey, lamports) => {
			const web3 = solanaWeb3;
			if (!provider.publicKey) return;
			let transaction = new web3.Transaction().add(web3.SystemProgram.transfer({
					fromPubkey: provider.publicKey,
					toPubkey: new web3.PublicKey(to_pubKey), //provider.publicKey,
					lamports: lamports,// * web3.LAMPORTS_PER_SOL,
				})
			);
			transaction.feePayer = provider.publicKey;
			transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
			console.log('transaction: ', transaction);
			return transaction;
		};

	};

	window.cryptoUtils = {
		phantomWallet: new PhantomWallet(),
	};
}

// createUnityInstance(canvas, config, (progress) => {
// 	progressBarFull.style.width = 100 * progress + "%";
//   }).then((unityInstance) => {
// 	window.unityInstance = unityInstance;
//   })
